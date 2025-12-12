import { useEffect, useState } from 'react';
import type { BookingInfo } from '../App';

interface SeatSelectionProps {
  bookingInfo: BookingInfo;
  onSeatSelect: (seatId: string) => void;
}

type SeatStatus = 'available' | 'reserved' | 'onsite' | 'disabled';

interface Seat {
  id: string;        // 좌석 코드 (예: B2-A1, G3-1F-01)
  status: SeatStatus;
  row: number;
  col: number;
  floor: string;     // 화면에 표시할 층 라벨 (B2, B1, 1F, 2F, 3F ...)
}

/** 백엔드 기본 URL */
const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8080';

/** RegionSearch 와 동일한 포맷(yyyy-MM-ddTHH:mm:00) */
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

/** floor 숫자 → UI 라벨 (B3, B2, B1, 1F, 2F, 3F ...) */
const formatFloorLabel = (n: number): string => {
  if (n < 0) return `B${-n}`;
  return `${n}F`;
};

/** 좌석 코드에서 행/열 계산 (예: "B2-A4" -> row=0(A), col=3) */
const parseRowColFromCode = (code: string): { row: number; col: number } => {
  const parts = code.split('-');
  const seatPart = (parts.length >= 2 ? parts[parts.length - 1] : parts[0]) ?? '';

  const rowChar = seatPart.charAt(0);
  const colStr = seatPart.slice(1);

  const rowIndex =
    rowChar >= 'A' && rowChar <= 'Z'
      ? rowChar.charCodeAt(0) - 'A'.charCodeAt(0)
      : 0;
  const colNum = parseInt(colStr, 10);
  const colIndex = (isNaN(colNum) ? 1 : colNum) - 1;

  return { row: rowIndex, col: colIndex < 0 ? 0 : colIndex };
};

/**
 * 백엔드 /api/parkinglots/{id}/spaces 응답 -> Seat 배열로 변환
 *  - floor: 숫자 floor 를 formatFloorLabel 로 변환
 *  - canRes, available, type 에 따라 status 결정
 */
const mapSpacesToSeats = (spaces: any[]): Seat[] => {
  return spaces.map((s: any, idx: number) => {
    const code: string = s.code ?? `S-${idx + 1}`;
    const floorNumber: number = Number(s.floor ?? 0);
    const floorLabel: string = formatFloorLabel(floorNumber);
    const { row, col } = parseRowColFromCode(code);

    const typeStr = String(s.type ?? '').toLowerCase();
    const canRes: boolean = !!s.canRes;
    const available: boolean = !!s.available;

    let status: SeatStatus;

    if (typeStr.includes('disabled')) {
      status = 'disabled'; // 장애인석
    } else if (!canRes) {
      status = 'onsite';   // 현장석 (can_res = 0)
    } else if (available) {
      status = 'available'; // 예약 가능
    } else {
      status = 'reserved';  // 이미 예약되어 예약 불가능
    }

    return {
      id: code,
      status,
      row,
      col,
      floor: floorLabel,
    };
  });
};

export default function SeatSelection({ bookingInfo, onSeatSelect }: SeatSelectionProps) {
  const [floors, setFloors] = useState<string[]>([]);
  const [selectedFloor, setSelectedFloor] = useState<string>('');
  const [allSeats, setAllSeats] = useState<Seat[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);

  const { parkingLot, selectedDate, startTime, endTime } = bookingInfo;

  /** 선택된 주차장 + 시간대에 대해 실제 좌석 정보 불러오기 */
  useEffect(() => {
    const fetchSeats = async () => {
      try {
        const start = toIsoDateTime(selectedDate, startTime);
        const end = toIsoDateTime(selectedDate, endTime);

        const params = new URLSearchParams();
        params.append('start', start);
        params.append('end', end);

        const res = await fetch(
          `${API_BASE_URL}/api/parkinglots/${parkingLot.id}/spaces?${params.toString()}`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (!res.ok) {
          console.error('좌석 정보 조회 실패', await res.text());
          setAllSeats([]);
          setFloors([]);
          setSelectedFloor('');
          return;
        }

        const json = (await res.json()) as any[];

        // 좌석 매핑
        const seats = mapSpacesToSeats(json);
        setAllSeats(seats);

        // 🔹 최저층 ~ 최고층 범위 계산 (숫자 floor 기준)
        const numericFloors = json
          .map((s: any) => Number(s.floor))
          .filter((n: number) => !Number.isNaN(n));

        if (numericFloors.length > 0) {
          const min = Math.min(...numericFloors);
          const max = Math.max(...numericFloors);

          const floorLabels: string[] = [];
          for (let f = max; f >= min; f--) {
            floorLabels.push(formatFloorLabel(f));
          }

          setFloors(floorLabels);
          setSelectedFloor(floorLabels[0] ?? '');
        } else {
          setFloors([]);
          setSelectedFloor('');
        }
      } catch (e) {
        console.error('좌석 정보 조회 오류', e);
        setAllSeats([]);
        setFloors([]);
        setSelectedFloor('');
      }
    };

    fetchSeats();
  }, [parkingLot.id, selectedDate, startTime, endTime]);

  const seatsForFloor =
    selectedFloor === ''
      ? []
      : allSeats.filter((seat) => seat.floor === selectedFloor);

  const handleSeatClick = (seat: Seat) => {
    // 예약 가능한 자리만 선택
    if (seat.status !== 'available') return;
    setSelectedSeat(seat.id);
  };

  const handleConfirm = () => {
    if (!selectedSeat) return;
    onSeatSelect(selectedSeat);
  };

  const getSeatClasses = (seat: Seat): string => {
    const isSelected = selectedSeat === seat.id;

    let bgClass = '';
    let borderClass = '';
    let textClass = 'text-gray-700';

    if (seat.status === 'available') {
      bgClass = 'bg-green-100';
      borderClass = 'border-green-300';
    } else if (seat.status === 'reserved') {
      bgClass = 'bg-gray-300';
      borderClass = 'border-gray-400';
    } else if (seat.status === 'onsite') {
      bgClass = 'bg-red-200';
      borderClass = 'border-red-300';
    } else if (seat.status === 'disabled') {
      bgClass = 'bg-purple-100';
      borderClass = 'border-purple-300';
    }

    if (isSelected) {
      bgClass = 'bg-blue-600';
      borderClass = 'border-blue-700';
      textClass = 'text-white';
    }

    return `w-16 h-16 rounded-xl border ${bgClass} ${borderClass} ${textClass} text-xs sm:text-sm flex items-center justify-center transition-colors`;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 층 선택 */}
      <div className="mb-6">
        <div className="mb-3">
          <span className="text-gray-900 font-medium">층 선택</span>
        </div>
        <div className="flex flex-wrap gap-3">
          {floors.map((floor) => (
            <button
              key={floor}
              onClick={() => {
                setSelectedFloor(floor);
                setSelectedSeat(null);
              }}
              className={`px-6 py-3 rounded-lg transition-all ${selectedFloor === floor
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              {floor}
            </button>
          ))}
        </div>
      </div>

      {/* 범례 */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-100 border border-green-300 rounded" />
            <span>예약 가능</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 border border-blue-700 rounded" />
            {/* 파란 배경 없이 텍스트만 */}
            <span>선택됨</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-300 border border-gray-400 rounded" />
            <span>예약 불가능</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-200 border border-red-300 rounded" />
            <span>현장석</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-100 border border-purple-300 rounded" />
            <span>장애인석</span>
          </div>
        </div>
      </div>

      {/* 좌석 영역 */}
      <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
        <div className="flex justify-center mb-8">
          <button className="px-8 py-2 rounded-full bg-gray-900 text-white text-sm">
            입구 / 출구
          </button>
        </div>

        <div className="relative overflow-x-auto">
          <div
            className="grid gap-3 mx-auto"
            style={{
              gridTemplateColumns: 'repeat(10, minmax(0, 1fr))',
            }}
          >
            {seatsForFloor.map((seat) => (
              <button
                key={seat.id}
                type="button"
                onClick={() => handleSeatClick(seat)}
                disabled={seat.status !== 'available'}
                className={
                  getSeatClasses(seat) +
                  (seat.status === 'available'
                    ? ' hover:shadow-md cursor-pointer'
                    : ' cursor-not-allowed opacity-80')
                }
                style={{
                  gridRowStart: seat.row + 1,
                  gridColumnStart: seat.col + 1,
                }}
              >
                {seat.id}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 확인 버튼 */}
      <div className="flex justify-end">
        <button
          onClick={handleConfirm}
          disabled={!selectedSeat}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {selectedSeat ? `${selectedSeat} 자리 예약하기` : '자리를 선택해주세요'}
        </button>
      </div>
    </div>
  );
}
