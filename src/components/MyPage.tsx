// src/components/MyPage.tsx
import { useEffect, useState } from 'react';
import { User, Mail, Calendar, Clock, MapPin, Car } from 'lucide-react';
import type { ParkingLot } from '../App';

const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8080';

interface MyPageProps {
  onReserve: (parkingLot: ParkingLot) => void;
}

interface Reservation {
  id: string | number;
  parkingLot: ParkingLot;
  reservedDate: Date; // 예약을 한 날짜
  usageDate: Date; // 실제 이용 날짜 (시작일 기준)
  startTime: string;
  endTime: string;
  seatNumber: string;
  status: 'upcoming' | 'completed' | 'cancelled';
}

interface Vehical {
  vehicalId: number;
  carNumber: string;
  model?: string | null;
}

export default function MyPage({ onReserve }: MyPageProps) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 차량 관련 상태
  const [vehicals, setVehicals] = useState<Vehical[]>([]);
  const [vehLoading, setVehLoading] = useState(false);
  const [vehError, setVehError] = useState('');
  const [newCarNumber, setNewCarNumber] = useState('');
  const [newCarModel, setNewCarModel] = useState('');
  const [vehSubmitting, setVehSubmitting] = useState(false);

  const getStatusBadge = (status: Reservation['status']) => {
    if (status === 'upcoming') {
      return (
        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
          예약 확정
        </span>
      );
    }
    if (status === 'completed') {
      return (
        <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full">
          이용 완료
        </span>
      );
    }
    if (status === 'cancelled') {
      return (
        <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full">
          취소됨
        </span>
      );
    }
  };

  useEffect(() => {
    const fetchMyPageData = async () => {
      try {
        setLoading(true);
        setError('');

        const userIdStr = localStorage.getItem('userId');
        if (!userIdStr) {
          setError('로그인 정보가 없습니다. 다시 로그인 해주세요.');
          setReservations([]);
          return;
        }

        const userId = Number(userIdStr);

        const resReservations = await fetch(
          `${API_BASE_URL}/api/users/${userId}/reservations`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          },
        );

        if (!resReservations.ok) {
          const text = await resReservations.text();
          throw new Error(text || '예약 내역 조회에 실패했습니다.');
        }

        const rawReservations: any[] = await resReservations.json();

        const mappedReservations: Reservation[] = rawReservations.map((r) => {
          // 백엔드 DTO 필드명 대응
          const start =
            r.usageStart || r.startDate || r.startTime || r.start_date;
          const end =
            r.usageEnd || r.endDate || r.endTime || r.end_date;
          const reservedAt =
            r.reservedDate || r.registerDate || r.regesterDate;

          const startDate = start ? new Date(start) : new Date();
          const endDate = end ? new Date(end) : startDate;
          const reservedDate = reservedAt ? new Date(reservedAt) : startDate;

          const seat =
            r.spaceCode || r.seatCode || r.seatNumber || '';

          let status: Reservation['status'] = 'upcoming';
          const now = new Date();
          if (endDate < now) {
            status = 'completed';
          }
          if (r.status === 'CANCELLED') {
            status = 'cancelled';
          }

          const lot: ParkingLot = {
            id: String(
              r.parkingLotId ?? r.parkinglotId ?? r.parking_lot_id ?? '',
            ),
            name: r.parkingLotName || r.parking_lot_name || '',
            address: r.parkingLotAddress || r.parking_lot_address || '',
            availableSpots: r.availableSpots ?? 0,
            basePrice: r.basePrice ?? r.estPrice ?? 0,
            region: {
              province: '',
              city: '',
              district: '',
              dong: '',
            },
            location: { lat: 0, lng: 0 },
          };

          return {
            id: r.id ?? r.reservationId,
            parkingLot: lot,
            reservedDate,
            usageDate: startDate,
            startTime: startDate.toTimeString().slice(0, 5),
            endTime: endDate.toTimeString().slice(0, 5),
            seatNumber: seat,
            status,
          };
        });

        setReservations(mappedReservations);
      } catch (err: any) {
        console.error(err);
        setError(err.message || '마이페이지 정보를 불러오지 못했습니다.');
        setReservations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMyPageData();
  }, []);

  // 차량 목록 불러오기
  useEffect(() => {
    const fetchVehicals = async () => {
      try {
        setVehLoading(true);
        setVehError('');

        const userIdStr = localStorage.getItem('userId');
        if (!userIdStr) {
          setVehError('로그인 정보가 없습니다. 다시 로그인 해주세요.');
          setVehicals([]);
          return;
        }

        const userId = Number(userIdStr);

        const res = await fetch(
          `${API_BASE_URL}/api/users/${userId}/vehicals`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          },
        );

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || '차량 정보를 불러오지 못했습니다.');
        }

        const data: any[] = await res.json();
        const mapped: Vehical[] = data.map((v) => ({
          vehicalId: v.vehicalId,
          carNumber: v.carNumber ?? v.plateNumber ?? '',
          model: v.model ?? null,
        }));
        setVehicals(mapped);
      } catch (err: any) {
        console.error(err);
        setVehError(err.message || '차량 정보를 불러오지 못했습니다.');
        setVehicals([]);
      } finally {
        setVehLoading(false);
      }
    };

    fetchVehicals();
  }, []);

  // 차량 등록
  const handleAddVehical = async () => {
    try {
      setVehError('');

      const userIdStr = localStorage.getItem('userId');
      if (!userIdStr) {
        setVehError('로그인 정보가 없습니다. 다시 로그인 해주세요.');
        return;
      }

      if (!newCarNumber.trim()) {
        setVehError('차량 번호를 입력해주세요.');
        return;
      }

      const userId = Number(userIdStr);
      setVehSubmitting(true);

      const res = await fetch(
        `${API_BASE_URL}/api/users/${userId}/vehicals`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            carNumber: newCarNumber.trim(),
            model: newCarModel.trim() || undefined,
          }),
        },
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || '차량 등록에 실패했습니다.');
      }

      const created: any = await res.json();
      const newVehical: Vehical = {
        vehicalId: created.vehicalId,
        carNumber: created.carNumber ?? created.plateNumber ?? newCarNumber.trim(),
        model: created.model ?? null,
      };

      setVehicals((prev) => [...prev, newVehical]);
      setNewCarNumber('');
      setNewCarModel('');
    } catch (err: any) {
      console.error(err);
      setVehError(err.message || '차량 등록에 실패했습니다.');
    } finally {
      setVehSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-gray-900 mb-8">마이페이지</h1>

      {/* 사용자 프로필 */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <div className="flex items-start justify-between mb-6">
          <h2 className="text-gray-900">프로필</h2>
          {/* 정보 수정 버튼 삭제됨 */}
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <p className="text-gray-500">이름</p>
              <p className="text-gray-900">
                {localStorage.getItem('userName') || '홍길동'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
              <Mail className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <p className="text-gray-500">이메일</p>
              <p className="text-gray-900">
                {localStorage.getItem('userEmail') || 'hong@example.com'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 🔹 차량 정보 (프로필과 예약 현황 사이에 추가) */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 className="text-gray-900 mb-4">차량 정보</h2>

        {vehLoading && (
          <p className="mb-3 text-sm text-gray-500">
            차량 정보를 불러오는 중입니다...
          </p>
        )}
        {vehError && (
          <p className="mb-3 text-sm text-red-600 break-all">{vehError}</p>
        )}

        {/* 차량 목록 */}
        {vehicals.length === 0 && !vehLoading ? (
          <p className="mb-4 text-gray-600">
            등록된 차량이 없습니다. 아래에서 차량을 등록해 주세요.
          </p>
        ) : (
          <div className="space-y-3 mb-4">
            {vehicals.map((v) => (
              <div
                key={v.vehicalId}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                    <Car className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-gray-900">{v.carNumber}</p>
                    {v.model && (
                      <p className="text-gray-500 text-sm">{v.model}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 차량 등록 폼 */}
        <div className="mt-4 border-t border-gray-100 pt-4">
          <h3 className="text-gray-900 mb-3 text-sm">차량 등록</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={newCarNumber}
              onChange={(e) => setNewCarNumber(e.target.value)}
              placeholder="차량 번호 (예: 12가3456)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
            <input
              type="text"
              value={newCarModel}
              onChange={(e) => setNewCarModel(e.target.value)}
              placeholder="차량 모델 (선택)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
            <button
              type="button"
              onClick={handleAddVehical}
              disabled={vehSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              {vehSubmitting ? '등록 중...' : '등록'}
            </button>
          </div>
        </div>
      </div>

      {/* 예약 현황 */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 className="text-gray-900 mb-6">예약 현황</h2>

        {loading && (
          <p className="mb-4 text-sm text-gray-500">
            예약 정보를 불러오는 중입니다...
          </p>
        )}
        {error && (
          <p className="mb-4 text-sm text-red-600">{error}</p>
        )}

        <div className="space-y-4">
          {reservations.map((reservation) => (
            <div
              key={reservation.id}
              className="border border-gray-200 rounded-lg p-5"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-gray-900">
                      {reservation.parkingLot.name}
                    </h3>
                    {getStatusBadge(reservation.status)}
                  </div>
                  <div className="flex items-start gap-2 text-gray-600 mb-1">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{reservation.parkingLot.address}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                    <Calendar className="w-4 h-4" />
                    <span>
                      예약일:{' '}
                      {reservation.reservedDate.toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <div className="w-4 h-4 flex items-center justify-center">
                      🅿️
                    </div>
                    <span>좌석: {reservation.seatNumber}</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                    <Calendar className="w-4 h-4" />
                    <span>
                      이용일:{' '}
                      {reservation.usageDate.toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>
                      이용시간: {reservation.startTime} ~ {reservation.endTime}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {!loading && !error && reservations.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              예약 내역이 없습니다.
            </div>
          )}
        </div>
      </div>

      {/* "최근 본 주차장" 섹션은 제거된 상태 */}
    </div>
  );
}
