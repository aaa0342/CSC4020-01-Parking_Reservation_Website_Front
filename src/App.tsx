// src/App.tsx
import { useState } from 'react';
import Header from './components/Header';
import Home from './components/Home';
import RegionSearch from './components/RegionSearch';
import MyPage from './components/MyPage';
import SeatSelection from './components/SeatSelection';
import Payment from './components/Payment';
import DateTimeModal from './components/DateTimeModal';
import Login from './components/Login';

export type Page = 'home' | 'region' | 'map' | 'mypage' | 'seats' | 'payment';

export interface ParkingLot {
  id: string;
  name: string;
  address: string;
  availableSpots: number;
  basePrice: number;
  region: {
    province: string;
    city: string;
    district: string;
    dong: string;
  };
  location: {
    lat: number;
    lng: number;
  };
}

export interface BookingInfo {
  parkingLot: ParkingLot;
  selectedDate: Date;
  startTime: string;
  endTime: string;
  // 좌석 선택 결과 (SeatSelection → Payment)
  selectedSeat?: string;
}

export default function App() {
  // 처음 렌더링 시 localStorage 기준으로 로그인 상태 복원
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return !!localStorage.getItem('accessToken');
  });
  const [userEmail, setUserEmail] = useState<string>(() => {
    return localStorage.getItem('userEmail') ?? '';
  });

  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [showDateTimeModal, setShowDateTimeModal] = useState(false);
  const [pendingPage, setPendingPage] = useState<Page | null>(null);
  const [bookingInfo, setBookingInfo] = useState<BookingInfo | null>(null);

  // Login 컴포넌트에서 로그인 성공 시 호출
  const handleLogin = (email: string) => {
    setUserEmail(email);
    setIsLoggedIn(true);

    // 혹시 Login 컴포넌트에서 안 넣었을 경우를 대비해 한 번 더 저장
    localStorage.setItem('userEmail', email);

    // accessToken, userId, userName, userPhone 등은 Login 쪽에서 저장했다고 가정
    setCurrentPage('home');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserEmail('');
    setCurrentPage('home');
    setBookingInfo(null);
    setPendingPage(null);
    setShowDateTimeModal(false);
  };

  // 로그인 안 했으면 로그인 화면만 보여줌
  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  const handleNavigate = (page: Page) => {
    // 지역 검색은 먼저 날짜·시간 선택
    if (page === 'region') {
      setPendingPage(page);
      setShowDateTimeModal(true);
    } else {
      setCurrentPage(page);
    }
  };

  const handleDateTimeConfirm = (date: Date, startTime: string, endTime: string) => {
    setShowDateTimeModal(false);
    if (pendingPage) {
      setBookingInfo((prev) => ({
        parkingLot: prev?.parkingLot ?? ({} as ParkingLot),
        selectedDate: date,
        startTime,
        endTime,
        selectedSeat: prev?.selectedSeat,
      }));
      setCurrentPage(pendingPage);
      setPendingPage(null);
    }
  };

  // 주차장 선택(지역 검색 / 지도 검색 / 마이페이지 공통)
  const handleReserve = (parkingLot: ParkingLot) => {
    setBookingInfo((prev) => ({
      parkingLot,
      selectedDate: prev?.selectedDate ?? new Date(),
      startTime: prev?.startTime ?? '00:00',
      endTime: prev?.endTime ?? '00:00',
      selectedSeat: prev?.selectedSeat,
    }));
    setCurrentPage('seats');
  };

  // SeatSelection 에서 좌석 선택 후 호출
  const handleSeatSelect = (seatId: string) => {
    setBookingInfo((prev) =>
      prev
        ? {
          ...prev,
          selectedSeat: seatId,
        }
        : prev
    );
    setCurrentPage('payment');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        userEmail={userEmail}
      />

      <main>
        {currentPage === 'home' && <Home onNavigate={handleNavigate} />}

        {currentPage === 'region' && bookingInfo && (
          <RegionSearch bookingInfo={bookingInfo} onReserve={handleReserve} />
        )}

        {/* {currentPage === 'map' && bookingInfo && (
          <MapSearch bookingInfo={bookingInfo} onReserve={handleReserve} />
        )} */}

        {currentPage === 'mypage' && <MyPage onReserve={handleReserve} />}

        {currentPage === 'seats' && bookingInfo && (
          <SeatSelection bookingInfo={bookingInfo} onSeatSelect={handleSeatSelect} />
        )}

        {currentPage === 'payment' && bookingInfo && (
          <Payment
            bookingInfo={bookingInfo}
            onComplete={() => setCurrentPage('home')}
          />
        )}
      </main>

      {showDateTimeModal && (
        <DateTimeModal
          onConfirm={handleDateTimeConfirm}
          onClose={() => {
            setShowDateTimeModal(false);
            setPendingPage(null);
          }}
        />
      )}
    </div>
  );
}
