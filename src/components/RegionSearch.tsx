import { useState, useMemo, useEffect } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import type { ParkingLot, BookingInfo } from '../App';

interface RegionSearchProps {
  bookingInfo: BookingInfo;
  onReserve: (parkingLot: ParkingLot) => void;
}

// === API 연동 관련 유틸 ===
const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8080';

const toIsoDateTime = (date: Date, time: string): string => {
  const [hh, mm] = time.split(':').map((v) => Number(v) || 0);
  const d = new Date(date);
  d.setHours(hh, mm, 0, 0);

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    `${d.getFullYear()}-` +
    `${pad(d.getMonth() + 1)}-` +
    `${pad(d.getDate())}T` +
    `${pad(d.getHours())}:` +
    `${pad(d.getMinutes())}:` +
    `00`
  );
};

const parseRegionFromAddress = (address: string) => {
  const parts = (address ?? '').trim().split(/\s+/);
  const province = parts[0] ?? '';
  const city = parts[1] ?? '';
  const district = parts[2] ?? '';
  const dong = parts[3] ?? '';
  return { province, city, district, dong };
};

const mapParkingLotsFromApi = (data: any[]): ParkingLot[] =>
  data.map((lot: any, idx: number) => {
    const parsed = parseRegionFromAddress(lot.address ?? '');

    return {
      id: String(lot.parkinglotId ?? lot.id ?? idx),
      name: lot.name ?? '이름 없는 주차장',
      address: lot.address ?? '',
      availableSpots:
        lot.availableCount ??
        lot.availableSpots ??
        lot.available ??
        lot.freeCount ??
        0,
      basePrice:
        lot.unitPrice ??
        lot.basePrice ??
        lot.unit_price ??
        0,
      region: {
        province: lot.province ?? lot.sido ?? parsed.province,
        city: lot.city ?? lot.sigungu ?? parsed.city,
        district: lot.district ?? lot.gu ?? parsed.district,
        dong: lot.dong ?? parsed.dong,
      },
      location: {
        lat: lot.lat ?? lot.latitude ?? 0,
        lng: lot.long ?? lot.lng ?? lot.longitude ?? 0,
      },
    };
  });

export default function RegionSearch({ bookingInfo, onReserve }: RegionSearchProps) {
  const [province, setProvince] = useState('전체');
  const [city, setCity] = useState('전체');
  const [district, setDistrict] = useState('전체');
  const [dong, setDong] = useState('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'spots'>('name');

  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);

  const { selectedDate, startTime, endTime } = bookingInfo;

  // 🔹 홈 화면에서 입력한 검색어를 초기값으로 반영
  useEffect(() => {
    const saved = localStorage.getItem('parking_search_query');
    if (saved && saved.trim()) {
      setSearchQuery(saved.trim());
      // 한 번 사용한 뒤에는 제거해서 다음 진입 때는 새 검색어 기준으로
      localStorage.removeItem('parking_search_query');
    }
  }, []);

  useEffect(() => {
    const fetchLots = async () => {
      try {
        const params = new URLSearchParams();
        params.append('start', toIsoDateTime(selectedDate, startTime));
        params.append('end', toIsoDateTime(selectedDate, endTime));

        if (province !== '전체') params.append('province', province);
        if (city !== '전체') params.append('city', city);
        if (district !== '전체') params.append('district', district);
        if (dong !== '전체') params.append('dong', dong);

        const keyword = searchQuery.trim();
        if (keyword) params.append('q', keyword);

        const hasRegionFilter =
          province !== '전체' || city !== '전체' || district !== '전체' || dong !== '전체';

        const endpoint = hasRegionFilter
          ? '/api/parkinglots/region'
          : '/api/parkinglots/search';

        const res = await fetch(`${API_BASE_URL}${endpoint}?${params.toString()}`, {
          headers: { 'Content-Type': 'application/json' },
        });

        if (!res.ok) {
          console.error('주차장 목록 조회 실패', await res.text());
          setParkingLots([]);
          return;
        }

        const json = (await res.json()) as any[];
        setParkingLots(mapParkingLotsFromApi(json));
      } catch (e) {
        console.error('주차장 목록 조회 오류', e);
        setParkingLots([]);
      }
    };

    fetchLots();
  }, [province, city, district, dong, searchQuery, selectedDate, startTime, endTime]);

  const filteredLots = useMemo(() => {
    let filtered = parkingLots.filter((lot) => {
      if (province !== '전체' && lot.region.province !== province) return false;
      if (city !== '전체' && lot.region.city !== city) return false;
      if (district !== '전체' && lot.region.district !== district) return false;
      if (dong !== '전체' && lot.region.dong !== dong) return false;
      if (searchQuery && !lot.name.includes(searchQuery) && !lot.address.includes(searchQuery)) {
        return false;
      }
      return true;
    });

    filtered.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'price') return (a.basePrice ?? 0) - (b.basePrice ?? 0);
      if (sortBy === 'spots') return (b.availableSpots ?? 0) - (a.availableSpots ?? 0);
      return 0;
    });

    return filtered;
  }, [parkingLots, province, city, district, dong, searchQuery, sortBy]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-gray-900 mb-2">지역별 검색</h1>
        <p className="text-gray-600">
          {bookingInfo.selectedDate.toLocaleDateString()} {bookingInfo.startTime} ~{' '}
          {bookingInfo.endTime}
        </p>
      </div>

      {/* 필터 */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <SlidersHorizontal className="w-5 h-5 text-gray-500" />
          <span className="font-medium text-gray-700">필터</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <select
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option>전체</option>
            <option>서울특별시</option>
            <option>경기도</option>
            <option>인천광역시</option>
          </select>

          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option>전체</option>
            <option>강남구</option>
            <option>서초구</option>
            <option>송파구</option>
          </select>

          <select
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option>전체</option>
            <option>역삼동</option>
            <option>삼성동</option>
            <option>대치동</option>
          </select>

          <select
            value={dong}
            onChange={(e) => setDong(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option>전체</option>
            <option>역삼1동</option>
            <option>역삼2동</option>
            <option>삼성1동</option>
            <option>삼성2동</option>
          </select>
        </div>

        <div className="flex gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="주차장 이름 또는 주소 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="name">이름순</option>
            <option value="price">가격순</option>
            <option value="spots">남은 자리순</option>
          </select>
        </div>
      </div>

      {/* 목록 */}
      <div className="space-y-4">
        {filteredLots.map((lot) => (
          <div key={lot.id} className="bg-white rounded-lg shadow-sm p-6 flex items-center gap-6">
            <div className="flex-1">
              <h3 className="text-gray-900 mb-2">{lot.name}</h3>
              <p className="text-gray-600 mb-2">{lot.address}</p>
              <div className="flex gap-4 text-gray-700">
                <span>남은 자리: {lot.availableSpots}개</span>
                <span>기본 요금: {(lot.basePrice ?? 0).toLocaleString()}원</span>
              </div>
            </div>
            <button
              onClick={() => onReserve(lot)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              예약하기
            </button>
          </div>
        ))}

        {filteredLots.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            검색 결과가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
