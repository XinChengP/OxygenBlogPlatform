'use client';

import AdminLayout from '../../../admin/components/AdminLayout';
import { Image, Upload, Plus, Settings } from 'lucide-react';

export default function AdminGalleryPage() {
  return (
    <AdminLayout>
      <div>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-800">图床管理</h1>
          <div className="flex items-center space-x-4">
            <button className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
              <Upload size={20} />
              <span>上传图片</span>
            </button>
            <button className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors">
              <Settings size={20} />
              <span>图床设置</span>
            </button>
          </div>
        </div>

        {/* 图床说明 */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-start space-x-4">
            <div className="bg-purple-100 p-3 rounded-lg">
              <Image className="text-purple-600" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Eiheir/Luo_Tianyi_Image 图床</h3>
              <p className="text-gray-600 mb-4">
                图床仓库已配置为 Eiheir/Luo_Tianyi_Image，您可以在这里上传和管理洛天依相关图片。
              </p>
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
                <p className="text-yellow-800 text-sm">
                  ⚠️ 注意：请确保已在系统设置中配置正确的 GitHub Token，否则无法上传图片。
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 图片列表占位 */}
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <Image className="mx-auto mb-4 text-gray-300" size={64} />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">图片列表</h3>
          <p className="text-gray-500">图床管理功能开发中...</p>
        </div>
      </div>
    </AdminLayout>
  );
}
