import React, { useState } from 'react';
import { ParkingSquare, Mail, Lock, AlertCircle } from 'lucide-react';

const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8080';

interface LoginProps {
  onLogin: (email: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    if (!email.includes('@')) {
      setError('올바른 이메일 주소를 입력해주세요.');
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || '요청에 실패했습니다.');
      }

      const data: any = await res.json();

      // accessToken (JWT 등)
      if (data.accessToken) {
        localStorage.setItem('accessToken', data.accessToken);
      }

      // 1) { accessToken, user: { ... } }
      // 2) { accessToken, userId, email, name, phone, ... }
      const user: any =
        data && typeof data === 'object' ? (data.user ?? data) : null;

      if (user) {
        try {
          localStorage.setItem('user', JSON.stringify(user));
        } catch {
          // ignore
        }

        const idValue =
          user.userId != null ? user.userId : user.id != null ? user.id : null;

        if (idValue != null) {
          localStorage.setItem('userId', String(idValue));
        }

        if (user.email) {
          localStorage.setItem('userEmail', user.email);
        }
        if (user.name) {
          localStorage.setItem('userName', user.name);
        }

        const phoneValue =
          user.phone ?? user.phoneNumber ?? user.tel ?? user.contact ?? null;

        if (phoneValue) {
          localStorage.setItem('userPhone', String(phoneValue));
        }
      }

      const loginEmail = (user && user.email) || email;
      onLogin(loginEmail);
    } catch (err: any) {
      console.error(err);
      setError(err.message || '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* 로고 및 타이틀 */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <ParkingSquare className="w-12 h-12 text-blue-600" />
            <span className="text-blue-600">파킹존</span>
          </div>
          <h1 className="text-gray-900 mb-2">로그인</h1>
          <p className="text-gray-600">주차장을 쉽고 빠르게 예약하세요</p>
        </div>

        {/* 로그인 폼 */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-gray-700 mb-2">이메일</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  className="w-full px-4 py-3 pl-11 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 mb-2">비밀번호</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pl-11 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
