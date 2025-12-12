// src/components/Header.tsx
import { ParkingSquare, LogOut, User } from 'lucide-react';
import type { Page } from '../App';

interface HeaderProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
  userEmail: string;
}

export default function Header({
  currentPage,
  onNavigate,
  onLogout,
  userEmail,
}: HeaderProps) {
  const menuItems: { label: string; page: Page }[] = [
    { label: '홈', page: 'home' },
    { label: '지역별 검색', page: 'region' },
    { label: '마이페이지', page: 'mypage' },
  ];

  const handleLogoutClick = () => {
    // 저장된 인증 정보 제거
    localStorage.removeItem('accessToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('userPhone');
    onLogout();
  };

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <ParkingSquare className="w-8 h-8 text-blue-600" />
            <span className="text-blue-600">파킹존</span>
          </button>

          <nav className="flex items-center gap-8">
            {menuItems.map((item) => (
              <button
                key={item.page}
                onClick={() => onNavigate(item.page)}
                className={`transition-colors ${currentPage === item.page
                  ? 'text-blue-600'
                  : 'text-gray-700 hover:text-blue-600'
                  }`}
              >
                {item.label}
              </button>
            ))}

            <div className="flex items-center gap-4 ml-4 pl-4 border-l border-gray-200">
              <div className="flex items-center gap-2 text-gray-700">
                <User className="w-4 h-4" />
                <span className="hidden md:inline">
                  {userEmail || '로그인 사용자'}
                </span>
              </div>
              <button
                onClick={handleLogoutClick}
                className="flex items-center gap-2 px-3 py-1.5 text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline">로그아웃</span>
              </button>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
