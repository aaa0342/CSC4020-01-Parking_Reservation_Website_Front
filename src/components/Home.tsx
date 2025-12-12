import React, { useState } from 'react';
import { Search } from 'lucide-react';
import type { Page } from '../App';

interface HomeProps {
  onNavigate: (page: Page) => void;
}

export default function Home({ onNavigate }: HomeProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = searchQuery.trim();
    // 홈에서 검색어를 저장해두고, 지역별 검색 페이지로 넘김
    if (trimmed) {
      localStorage.setItem('parking_search_query', trimmed);
    } else {
      localStorage.removeItem('parking_search_query');
    }

    // App의 handleNavigate('region')가 호출되면서
    // 날짜/시간 설정 모달 → 지역별 검색 페이지 순서로 진행됨
    onNavigate('region');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4">
      <div className="text-center mb-12">
        <h1 className="text-gray-900 mb-4">주차장을 쉽고 빠르게 예약하세요</h1>
        <p className="text-gray-600">
          전국의 주차장을 검색하고 미리 예약할 수 있습니다
        </p>
      </div>

      <form onSubmit={handleSearch} className="w-full max-w-2xl">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="주차장 이름 또는 주소를 검색하세요"
            className="w-full px-6 py-4 pr-14 rounded-full border-2 border-gray-300 focus:border-blue-600 focus:outline-none transition-colors"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
