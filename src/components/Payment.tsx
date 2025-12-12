// src/components/Payment.tsx
import { useEffect, useMemo, useState } from 'react';
import {
  CreditCard,
  Smartphone,
  User,
  MapPin,
  Clock,
  CheckCircle,
  Car,
} from 'lucide-react';
import type { BookingInfo } from '../App';

const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8080';

interface PaymentProps {
  bookingInfo: BookingInfo;
  onComplete: () => void;
}

type PaymentMethod = 'card' | 'phone' | 'transfer';

interface Vehicle {
  id: number;
  plateNumber: string;
  model: string;
}

/** 01011112222 -> 010-1111-2222 형식으로 표시용 포맷 */
const formatPhoneNumber = (raw: string | null): string => {
  if (!raw) return '-';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return raw;
};

/** 프론트 결제 수단 -> 서버 문자열 */
const mapPaymentMethodToServer = (method: PaymentMethod): string => {
  switch (method) {
    case 'card':
      return 'CARD';
    case 'phone':
      return 'MOBILE';
    case 'transfer':
      return 'ACCOUNT';
    default:
      return 'CARD';
  }
};

export default function Payment({ bookingInfo, onComplete }: PaymentProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 차량 목록 관련 상태
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [vehiclesError, setVehiclesError] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(
    null,
  );

  // 로그인 정보(localStorage) 파싱
  const loginInfo = useMemo(() => {
    let parsedUser: any = null;
    const rawUser = localStorage.getItem('user');
    if (rawUser) {
      try {
        parsedUser = JSON.parse(rawUser);
      } catch {
        parsedUser = null;
      }
    }

    const userIdFromItem = localStorage.getItem('userId');
    const userNameFromItem = localStorage.getItem('userName');
    const userPhoneFromItem = localStorage.getItem('userPhone');

    const userId =
      userIdFromItem ??
      (parsedUser && (parsedUser.userId ?? parsedUser.id) != null
        ? String(parsedUser.userId ?? parsedUser.id)
        : null);

    const userName =
      userNameFromItem ??
      (parsedUser && (parsedUser.name ?? parsedUser.username)) ??
      '-';

    const userPhone =
      userPhoneFromItem ??
      (parsedUser && (parsedUser.phone ?? parsedUser.tel)) ??
      '-';

    return { userId, userName, userPhone };
  }, []);

  /** 유저의 차량 목록 불러오기 */
  useEffect(() => {
    if (!loginInfo.userId) return;

    const fetchVehicles = async () => {
      try {
        setVehiclesLoading(true);
        setVehiclesError('');

        const res = await fetch(
          `${API_BASE_URL}/api/users/${loginInfo.userId}/vehicals`,
        );

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || '차량 정보를 불러오지 못했습니다.');
        }

        const data: any[] = await res.json();

        const mapped: Vehicle[] = data.map((v) => ({
          id: Number(v.vehicalId ?? v.id),
          plateNumber:
            v.carNumber ?? v.plateNumber ?? v.licenseNumber ?? '차량번호 미정',
          model: v.model ?? v.name ?? '',
        }));

        setVehicles(mapped);
        if (mapped.length > 0) {
          setSelectedVehicleId(mapped[0].id);
        }
      } catch (e: any) {
        console.error(e);
        setVehicles([]);
        setVehiclesError(e.message || '차량 정보를 불러오지 못했습니다.');
      } finally {
        setVehiclesLoading(false);
      }
    };

    fetchVehicles();
  }, [loginInfo.userId]);

  /** 총 결제 금액 = 시간당 요금 * 예약 시간(올림) */
  const calculatePrice = () => {
    const parseTimeToMinutes = (t: string) => {
      const [hh, mm] = t.split(':').map((v) => Number(v) || 0);
      return hh * 60 + mm;
    };

    const startMin = parseTimeToMinutes(bookingInfo.startTime);
    const endMin = parseTimeToMinutes(bookingInfo.endTime);
    const diffMin = endMin - startMin;

    if (diffMin <= 0) {
      return bookingInfo.parkingLot.basePrice;
    }

    const hours = Math.ceil(diffMin / 60);
    return bookingInfo.parkingLot.basePrice * hours;
  };

  const toIsoDateTime = (date: Date, time: string) => {
    const [hh, mm] = time.split(':').map((v) => Number(v));
    const d = new Date(date);
    d.setHours(hh || 0, mm || 0, 0, 0);
    return (
      `${d.getFullYear()}-` +
      String(d.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(d.getDate()).padStart(2, '0') +
      'T' +
      String(d.getHours()).padStart(2, '0') +
      ':' +
      String(d.getMinutes()).padStart(2, '0') +
      ':00'
    );
  };

  const handlePayment = async () => {
    setError('');

    const { userId } = loginInfo;
    if (!userId) {
      setError('로그인 정보가 없습니다. 다시 로그인 해주세요.');
      return;
    }

    if (!bookingInfo.selectedSeat) {
      setError('선택된 자리가 없습니다.');
      return;
    }

    if (!selectedVehicleId) {
      setError('차량을 선택해주세요.');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        userId: Number(userId),
        parkingLotId: Number(bookingInfo.parkingLot.id),
        seatCode: bookingInfo.selectedSeat,
        startDateTime: toIsoDateTime(
          bookingInfo.selectedDate,
          bookingInfo.startTime,
        ),
        endDateTime: toIsoDateTime(
          bookingInfo.selectedDate,
          bookingInfo.endTime,
        ),
        paymentAmount: calculatePrice(),
        paymentMethod: mapPaymentMethodToServer(paymentMethod),
        vehicalId: selectedVehicleId,
      };

      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_BASE_URL}/api/reservations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || '예약/결제에 실패했습니다.');
      }

      setShowSuccess(true);
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || '예약/결제에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <div className="text-center">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
          <h1 className="text-gray-900 mb-2">예약이 완료되었습니다!</h1>
          <p className="text-gray-600">
            예약 정보는 마이페이지에서 확인하실 수 있습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-gray-900 mb-8">예약 및 결제</h1>

      <div className="grid md:grid-cols-3 gap-6">
        {/* 예약 정보 영역 */}
        <div className="md:col-span-2 space-y-6">
          {/* 예약자 정보 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-gray-900 mb-4">예약자 정보</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-gray-500">이름</p>
                  <p className="text-gray-900">
                    {loginInfo.userName || '-'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-gray-500">연락처</p>
                  <p className="text-gray-900">
                    {formatPhoneNumber(loginInfo.userPhone)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 차량 정보 (새로 추가된 카드) */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-gray-900 mb-4">차량 정보</h2>
            {vehiclesLoading && (
              <p className="text-sm text-gray-500">
                차량 정보를 불러오는 중입니다...
              </p>
            )}
            {vehiclesError && (
              <p className="text-sm text-red-600 mb-2 break-all">
                {vehiclesError}
              </p>
            )}

            {!vehiclesLoading && vehicles.length === 0 && !vehiclesError && (
              <p className="text-sm text-gray-500">
                등록된 차량이 없습니다. 마이페이지에서 차량을 먼저 등록해주세요.
              </p>
            )}

            <div className="space-y-3 mt-2">
              {vehicles.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedVehicleId(v.id)}
                  className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-colors ${selectedVehicleId === v.id
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <Car className="w-5 h-5 text-gray-600" />
                  <div className="text-left">
                    <p className="text-gray-900">{v.plateNumber}</p>
                    {v.model && (
                      <p className="text-sm text-gray-500">{v.model}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 주차장 정보 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-gray-900 mb-4">주차장 정보</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                <div>
                  <p className="text-gray-500">주차장</p>
                  <p className="text-gray-900">
                    {bookingInfo.parkingLot.name}
                  </p>
                  <p className="text-gray-600">
                    {bookingInfo.parkingLot.address}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 flex items-center justify-center text-gray-400">
                  🅿️
                </div>
                <div>
                  <p className="text-gray-500">선택한 자리</p>
                  <p className="text-gray-900">
                    {bookingInfo.selectedSeat}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 이용 시간 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-gray-900 mb-4">이용 시간</h2>
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-gray-400 mt-1" />
              <div>
                <p className="text-gray-900">
                  {bookingInfo.selectedDate.toLocaleDateString()}
                </p>
                <p className="text-gray-600">
                  {bookingInfo.startTime} ~ {bookingInfo.endTime}
                </p>
              </div>
            </div>
          </div>

          {/* 결제 수단 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-gray-900 mb-4">결제 수단</h2>
            <div className="space-y-3">
              <button
                onClick={() => setPaymentMethod('card')}
                className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-colors ${paymentMethod === 'card'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <CreditCard className="w-5 h-5" />
                <span>신용/체크카드</span>
              </button>

              <button
                onClick={() => setPaymentMethod('phone')}
                className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-colors ${paymentMethod === 'phone'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <Smartphone className="w-5 h-5" />
                <span>휴대폰 결제</span>
              </button>

              <button
                onClick={() => setPaymentMethod('transfer')}
                className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-colors ${paymentMethod === 'transfer'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <div className="w-5 h-5 flex items-center justify-center">
                  🏦
                </div>
                <span>계좌이체</span>
              </button>
            </div>

            {error && (
              <p className="mt-3 text-sm text-red-600 break-all">{error}</p>
            )}
          </div>
        </div>

        {/* 결제 요약 박스 */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
            <h2 className="text-gray-900 mb-4">결제 금액</h2>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-gray-600">
                <span>기본 요금</span>
                <span>
                  {bookingInfo.parkingLot.basePrice.toLocaleString()}원
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>할인</span>
                <span>-0원</span>
              </div>
              <div className="h-px bg-gray-200" />
              <div className="flex justify-between text-gray-900">
                <span>총 결제 금액</span>
                <span>{calculatePrice().toLocaleString()}원</span>
              </div>
            </div>

            <button
              onClick={handlePayment}
              disabled={loading}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              {loading
                ? '결제 처리 중...'
                : `${calculatePrice().toLocaleString()}원 결제하기`}
            </button>

            <p className="text-gray-500 mt-4 text-center">
              결제 시 이용약관에 동의하는 것으로 간주됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
