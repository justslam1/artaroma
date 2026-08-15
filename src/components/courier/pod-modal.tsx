'use client';

import React, { useRef, useState, useEffect } from 'react';
import { DeliveryTask } from '@/lib/types';
import { X, CheckCircle, Camera, PenTool, Eraser, UserCheck } from 'lucide-react';

interface PODModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: DeliveryTask | null;
  onSubmitPOD: (taskId: string, recipientName: string, photoUrl: string, signatureUrl: string) => void;
}

export function PODModal({ isOpen, onClose, task, onSubmitPOD }: PODModalProps) {
  const [recipientName, setRecipientName] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#1e40af';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [isOpen]);

  if (!isOpen || !task) return null;

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPhotoUrl(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const signatureDataUrl = canvas ? canvas.toDataURL('image/png') : '';
    const finalPhoto = photoUrl || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=500&auto=format&fit=crop&q=60';
    onSubmitPOD(task.id, recipientName || task.customer_name, finalPhoto, signatureDataUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="bg-blue-700 px-5 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <UserCheck className="w-5 h-5" />
            <div>
              <h3 className="font-bold text-base">Digital Proof of Delivery (POD)</h3>
              <p className="text-xs text-blue-200">Bukti Serah Terima #{task.so_number}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-blue-200 hover:text-white p-1 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-sm">
          {/* Destination */}
          <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl text-xs space-y-0.5">
            <div className="text-gray-400">Penerima & Alamat:</div>
            <div className="font-bold text-slate-800">{task.company_name}</div>
            <div className="text-gray-600">{task.delivery_address}</div>
          </div>

          {/* Recipient Name */}
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1">
              Nama Penerima <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Pak Budi / Ibu Sari (Gudang)"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
            />
          </div>

          {/* Photo Upload */}
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1">
              Foto Serah Terima <span className="text-red-500">*</span>
            </label>
            <div className="border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-xl p-3 text-center relative cursor-pointer transition-colors bg-gray-50">
              <input type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
              {photoUrl ? (
                <img src={photoUrl} alt="Foto Serah Terima" className="max-h-28 mx-auto rounded-lg border border-gray-200" />
              ) : (
                <div className="py-3 space-y-1">
                  <Camera className="w-6 h-6 text-blue-500 mx-auto" />
                  <span className="text-sm text-gray-500 block">Ambil Foto / Upload Kamera</span>
                </div>
              )}
            </div>
          </div>

          {/* Signature Canvas */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <PenTool className="w-4 h-4 text-blue-600" />
                Tanda Tangan Digital <span className="text-red-500">*</span>
              </label>
              <button type="button" onClick={clearCanvas} className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1">
                <Eraser className="w-3 h-3" /> Bersihkan
              </button>
            </div>
            <div className="rounded-xl overflow-hidden border-2 border-gray-300 bg-white">
              <canvas
                ref={canvasRef}
                width={360}
                height={130}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full touch-none cursor-crosshair bg-white"
              />
            </div>
            {!hasSignature && (
              <span className="text-[11px] text-amber-600 mt-1 block">
                Minta customer menggoreskan tanda tangan di area putih di atas.
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-200 text-slate-600 text-sm font-medium hover:bg-gray-50">
              Batal
            </button>
            <button
              type="submit"
              disabled={!recipientName}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-1.5 shadow transition-all ${
                !recipientName
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <CheckCircle className="w-4 h-4" /> Selesaikan & Update DELIVERED
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
