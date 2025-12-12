import { useState } from 'react';
import { X } from 'lucide-react';

interface DateTimeModalProps {
  onConfirm: (date: Date, startTime: string, endTime: string) => void;
  onClose: () => void;
}

// 🔹 0 ~ 23 시 (24시간 전체)
const HOURS = Array.from({ length: 24 }, (_, i) => i); // [0, 1, 2, ..., 23]

function formatHourLabel(hour: number) {
  const isAM = hour < 12;
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const ampm = isAM ? '오전' : '오후';
  return `${ampm} ${displayHour.toString().padStart(2, '0')}:00`;
}

function toTimeString(hour: number) {
  // "00:00", "09:00", "18:00" 형태
  return `${hour.toString().padStart(2, '0')}:00`;
}

export default function DateTimeModal({ onConfirm, onClose }: DateTimeModalProps) {
  const today = new Date().toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState(today);
  const [startHour, setStartHour] = useState(9);   // 기본값: 09:00
  const [endHour, setEndHour] = useState(18);      // 기본값: 18:00

  const handleConfirm = () => {
    const date = new Date(selectedDate);
    const startTime = toTimeString(startHour);
    const endTime = toTimeString(endHour);
    onConfirm(date, startTime, endTime);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-gray-900">날짜 및 시간 선택</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* 날짜 선택 */}
          <div>
            <label className="block text-gray-700 mb-2">날짜</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={today}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 시작 시간 */}
          <div>
            <label className="block text-gray-700 mb-2">시작 시간</label>
            <select
              value={startHour}
              onChange={(e) => setStartHour(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {formatHourLabel(h)}
                </option>
              ))}
            </select>
          </div>

          {/* 종료 시간 */}
          <div>
            <label className="block text-gray-700 mb-2">종료 시간</label>
            <select
              value={endHour}
              onChange={(e) => setEndHour(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {formatHourLabel(h)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
