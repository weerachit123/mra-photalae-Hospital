import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Check, Building2 } from 'lucide-react';

interface Department {
  id: number;
  code: string;
  name: string;
  type: 'OPD' | 'IPD';
  default_limit: number;
}

export default function ManageDepartments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState<Partial<Department>>({
    code: '',
    name: '',
    type: 'OPD',
    default_limit: 10
  });

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments');
      const data = await res.json();
      if (data.success) {
        setDepartments(data.data);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to fetch departments');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.code || !formData.name) {
      alert('กรุณากรอกรหัสและชื่อแผนก');
      return;
    }

    try {
      const url = editingId ? `/api/departments/${editingId}` : '/api/departments';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (data.success) {
        setIsAdding(false);
        setEditingId(null);
        setFormData({ code: '', name: '', type: 'OPD', default_limit: 10 });
        fetchDepartments();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Failed to save department');
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`ต้องการลบแผนก ${name} ใช่หรือไม่?`)) return;

    try {
      const res = await fetch(`/api/departments/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchDepartments();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Failed to delete department');
    }
  };

  const startEdit = (dept: Department) => {
    setEditingId(dept.id);
    setFormData(dept);
    setIsAdding(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({ code: '', name: '', type: 'OPD', default_limit: 10 });
  };

  if (loading) return <div className="p-8 text-center text-slate-500">กำลังโหลดข้อมูล...</div>;

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 bg-white flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <Building2 className="w-6 h-6 text-blue-600" />
              จัดการแผนกหลัก
            </h3>
            <p className="mt-1 text-sm text-slate-500 font-medium">
              เพิ่ม ลด แก้ไข แผนกสำหรับ OPD และ IPD
            </p>
          </div>
          {!isAdding && !editingId && (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4 mr-2" /> เพิ่มแผนก
            </button>
          )}
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm font-medium">
              {error}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-100">
                  <th className="pb-3 px-4 font-bold text-slate-500 uppercase text-xs tracking-wider">ประเภท</th>
                  <th className="pb-3 px-4 font-bold text-slate-500 uppercase text-xs tracking-wider">รหัสแผนก</th>
                  <th className="pb-3 px-4 font-bold text-slate-500 uppercase text-xs tracking-wider">ชื่อแผนก</th>
                  <th className="pb-3 px-4 font-bold text-slate-500 uppercase text-xs tracking-wider">จำนวนเคสเริ่มต้น</th>
                  <th className="pb-3 px-4 font-bold text-slate-500 uppercase text-xs tracking-wider text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isAdding && (
                  <tr className="bg-blue-50/50">
                    <td className="py-4 px-4">
                      <select
                        value={formData.type}
                        onChange={e => setFormData({...formData, type: e.target.value as 'OPD'|'IPD'})}
                        className="w-full border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="OPD">OPD</option>
                        <option value="IPD">IPD</option>
                      </select>
                    </td>
                    <td className="py-4 px-4">
                      <input
                        type="text"
                        value={formData.code}
                        onChange={e => setFormData({...formData, code: e.target.value})}
                        placeholder="รหัส"
                        className="w-full border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-4 px-4">
                      <input
                        type="text"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        placeholder="ชื่อแผนก"
                        className="w-full border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-4 px-4">
                      <input
                        type="number"
                        value={formData.default_limit}
                        onChange={e => setFormData({...formData, default_limit: parseInt(e.target.value) || 0})}
                        className="w-full border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={handleSave} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={cancelEdit} className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )}

                {departments.map(dept => editingId === dept.id ? (
                  <tr key={dept.id} className="bg-blue-50/50">
                    <td className="py-4 px-4">
                      <select
                        value={formData.type}
                        onChange={e => setFormData({...formData, type: e.target.value as 'OPD'|'IPD'})}
                        className="w-full border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="OPD">OPD</option>
                        <option value="IPD">IPD</option>
                      </select>
                    </td>
                    <td className="py-4 px-4">
                      <input
                        type="text"
                        value={formData.code}
                        onChange={e => setFormData({...formData, code: e.target.value})}
                        className="w-full border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-4 px-4">
                      <input
                        type="text"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className="w-full border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-4 px-4">
                      <input
                        type="number"
                        value={formData.default_limit}
                        onChange={e => setFormData({...formData, default_limit: parseInt(e.target.value) || 0})}
                        className="w-full border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={handleSave} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={cancelEdit} className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={dept.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${dept.type === 'OPD' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {dept.type}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-medium text-slate-700">{dept.code}</td>
                    <td className="py-4 px-4 font-medium text-slate-900">{dept.name}</td>
                    <td className="py-4 px-4 text-slate-600">{dept.default_limit}</td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => startEdit(dept)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(dept.id, dept.name)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                
                {departments.length === 0 && !isAdding && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      ยังไม่มีข้อมูลแผนก
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
