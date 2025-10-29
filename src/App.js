import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import './App.css';

// تابع تولید اکسل
const exportToExcel = (data, formatGregorianDate, filename = 'هاتن و دەرچوون') => {
  const wb = XLSX.utils.book_new();
  
  const excelData = data.map((record, index) => ({
    'زنجیرە': index + 1,
    'ناو': record.person_name || '-',
    'ئۆتۆمبێل': record.car_model || '-',
    'ژمارەی ئۆتۆمبێل': record.car_number || '-',
    'یەکە': record.unit || '-',
    'پیشە': record.person_type || '-',
    'مۆلەت پێدەر': record.permit_giver || '-',
    'کاتی هاتن': record.entry_time ? formatGregorianDate(record.entry_time) : '-',
    'کاتی دەرچوون': record.exit_time ? formatGregorianDate(record.exit_time) : '-',
    'بەروار': record.date || '-',
    'تێبینی': record.notes || '-'
  }));

  const ws = XLSX.utils.json_to_sheet(excelData);
  
  const colWidths = [
    { wch: 8 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 12 },
    { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 30 }
  ];
  ws['!cols'] = colWidths;

  // راست‌چین کردن
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cell_address = { c: C, r: R };
      const cell_ref = XLSX.utils.encode_cell(cell_address);
      if (!ws[cell_ref]) continue;
      if (!ws[cell_ref].s) ws[cell_ref].s = {};
      ws[cell_ref].s.alignment = { horizontal: 'right' };
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, 'ترددها');
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  const today = new Date().toISOString().split('T')[0];
  saveAs(blob, `${filename}-${today}.xlsx`);
};

function App() {
  const [activeTab, setActiveTab] = useState('form');
  const [formData, setFormData] = useState({
    person_name: '', car_model: '', car_number: '', unit: '', 
    person_type: '', permit_giver: '', notes: '',
    entry_time: '', exit_time: '', date: '' // فیلدهای زمان دستی
  });
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState({ startDate: '', endDate: '' });
  const [filteredByDate, setFilteredByDate] = useState([]);

  // تابع فرمت تاریخ
  const formatGregorianDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const baghdadTime = new Date(date.getTime() + (3 * 60 * 60 * 1000));
    const day = baghdadTime.getUTCDate().toString().padStart(2, '0');
    const month = (baghdadTime.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = baghdadTime.getUTCFullYear();
    const hours = baghdadTime.getUTCHours().toString().padStart(2, '0');
    const minutes = baghdadTime.getUTCMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} - ${hours}:${minutes}`;
  };

  // فیلتر تاریخ
  const filterByDateRange = () => {
    if (!dateFilter.startDate && !dateFilter.endDate) {
      setFilteredByDate(filteredRecords);
      return;
    }
    const filtered = filteredRecords.filter(record => {
      const recordDate = new Date(record.date);
      const start = dateFilter.startDate ? new Date(dateFilter.startDate) : new Date('1900-01-01');
      const end = dateFilter.endDate ? new Date(dateFilter.endDate) : new Date('2100-01-01');
      return recordDate >= start && recordDate <= end;
    });
    setFilteredByDate(filtered);
  };

  // خروجی اکسل فیلتر شده
  const exportFilteredExcel = () => {
    const dataToExport = filteredByDate.length > 0 ? filteredByDate : filteredRecords;
    const filename = dateFilter.startDate || dateFilter.endDate 
      ? `هاتن و چوون-${dateFilter.startDate || 'Start'}-تاکو-${dateFilter.endDate || 'End'}`
      : 'بازگەی-لەشکر';
    exportToExcel(dataToExport, formatGregorianDate, filename);
  };

  // دریافت داده‌ها
  const fetchRecords = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('Bazga')
      .select('*')
      .order('id', { ascending: false });
    if (error) {
      setMessage('هەلە لە وەرگرتنی زانیاری: ' + error.message);
    } else {
      setRecords(data || []);
      setFilteredRecords(data || []);
      setFilteredByDate(data || []);
    }
    setLoading(false);
  };

  // جستجو
  const handleSearch = (term) => {
    setSearchTerm(term);
    if (term === '') {
      setFilteredRecords(records);
      setFilteredByDate(records);
    } else {
      const filtered = records.filter(record =>
        record.person_name?.toLowerCase().includes(term.toLowerCase()) ||
        record.car_number?.toLowerCase().includes(term.toLowerCase()) ||
        record.unit?.toLowerCase().includes(term.toLowerCase()) ||
        record.person_type?.toLowerCase().includes(term.toLowerCase()) ||
        record.permit_giver?.toLowerCase().includes(term.toLowerCase()) ||
        record.car_model?.toLowerCase().includes(term.toLowerCase())
      );
      setFilteredRecords(filtered);
      setFilteredByDate(filtered);
    }
  };

  // ثبت داده
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const now = new Date();
      const baghdadTime = new Date(now.getTime() + (3 * 60 * 60 * 1000));
      const entryTime = formData.entry_time || baghdadTime.toISOString();
      const selectedDate = formData.date || baghdadTime.toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('Bazga')
        .insert([{
          ...formData,
          entry_time: entryTime,
          date: selectedDate,
          exit_time: formData.exit_time || null
        }]);

      if (error) {
        setMessage('هەلە لە تۆمارکردن: ' + error.message);
      } else {
        setMessage('✅ بەسەرکەوتوویی تۆمار کرا');
        setFormData({
          person_name: '', car_model: '', car_number: '', unit: '',
          person_type: '', permit_giver: '', notes: '',
          entry_time: '', exit_time: '', date: ''
        });
        fetchRecords();
      }
    } catch (err) {
      setMessage('هەلە: ' + err.message);
    }
  };

  useEffect(() => { fetchRecords(); }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ثبت خروج
  const recordExit = async (id) => {
    try {
      const now = new Date();
      const baghdadTime = new Date(now.getTime() + (3 * 60 * 60 * 1000));
      const { error } = await supabase
        .from('Bazga')
        .update({ exit_time: baghdadTime.toISOString() })
        .eq('id', id);
      if (error) {
        setMessage('هەلە لە تۆمارکردن خروج: ' + error.message);
      } else {
        setMessage('✅ خروج ثبت شد');
        fetchRecords();
      }
    } catch (err) {
      setMessage('هەلە: ' + err.message);
    }
  };

  return (
    <div className="App" dir="rtl">
      <div className="tabs">
        <button className={activeTab === 'form' ? 'active' : ''} onClick={() => setActiveTab('form')}>
          📝 تۆماری هاتن و دەرچوون
        </button>
        <button className={activeTab === 'list' ? 'active' : ''} onClick={() => setActiveTab('list')}>
          📊 پێشاندانی داتاکان ({records.length})
        </button>
      </div>

      {activeTab === 'form' && (
        <div className="tab-content">
          <h1>📝 سیستەمی بازگەی لەشکر</h1>
          <form onSubmit={handleSubmit} className="form">
            <div className="form-row">
              <input type="text" name="person_name" placeholder="ناو" value={formData.person_name} onChange={handleChange} />
              <input type="text" name="car_model" placeholder="جۆری ئۆتۆمبێل" value={formData.car_model} onChange={handleChange} />
            </div>
            <div className="form-row">
              <input type="text" name="car_number" placeholder="ژمارەی ئۆتۆمبێل" value={formData.car_number} onChange={handleChange} />
              <input type="text" name="unit" placeholder="یەکە (بەش)" value={formData.unit} onChange={handleChange} list="unit-suggestions" />
            </div>
            <div className="form-row">
              <input type="text" name="person_type" placeholder="جۆر" value={formData.person_type} onChange={handleChange} list="type-suggestions" />
              <input type="text" name="permit_giver" placeholder="مۆلەتپێدەر" value={formData.permit_giver} onChange={handleChange} />
            </div>
         {/* فیلدهای زمان دستی */}
<div className="form-row">
  <div className="input-with-label">
    <label>کاتی هاتن (ئارەزومەندانە)</label>
    <input 
      type="datetime-local" 
      name="entry_time" 
      value={formData.entry_time} 
      onChange={handleChange} 
    />
  </div>
  <div className="input-with-label">
    <label>کاتی دەرچوون (ئارەزومەندانە)</label>
    <input 
      type="datetime-local" 
      name="exit_time" 
      value={formData.exit_time} 
      onChange={handleChange} 
    />
  </div>
</div>
<div className="form-row">
  <div className="input-with-label">
    <label>بەروار (ئارەزومەندانە)</label>
    <input 
      type="date" 
      name="date" 
      value={formData.date} 
      onChange={handleChange} 
    />
  </div>
  <div style={{flex: 1}}></div>
</div>
            <textarea name="notes" placeholder="تێبینی" value={formData.notes} onChange={handleChange} />
            <button type="submit" className="submit-btn">تۆمارکردن</button>
          </form>
          {message && <div className="message">{message}</div>}
          <datalist id="unit-suggestions">
            <option value="ب/1" /><option value="ب/2" /><option value="ب/3" /><option value="اسناد" />
          </datalist>
          <datalist id="type-suggestions">
            <option value="پێشمەرگەی لەشکر" /><option value="مێوان" /><option value="کرێکار" />
          </datalist>
        </div>
      )}

      {activeTab === 'list' && (
        <div className="tab-content">
          <h1>📊 لیستی هاتوچۆ</h1>
          <div className="search-section">
            <input type="text" placeholder="گەران لە گشت بابەتەکان..." value={searchTerm} onChange={(e) => handleSearch(e.target.value)} className="search-input" />
            <span className="record-count">تعدادی: {filteredRecords.length} تۆمار</span>
            <button onClick={fetchRecords} className="refresh-btn">🔄 نوێکردنەوە</button>
            <button onClick={exportFilteredExcel} className="excel-btn" disabled={filteredRecords.length === 0}>📊 دەرکردنی Excel</button>
          </div>

          <div className="date-filter-section">
            <h3>📅 فیلتەری بەروار</h3>
            <div className="date-inputs">
              <input type="date" value={dateFilter.startDate} onChange={(e) => setDateFilter({...dateFilter, startDate: e.target.value})} placeholder="لە بەروای" />
              <input type="date" value={dateFilter.endDate} onChange={(e) => setDateFilter({...dateFilter, endDate: e.target.value})} placeholder="تا بەرواری" />
              <button onClick={filterByDateRange} className="filter-btn">🔍 فیلتەر بکە</button>
              <button onClick={() => { setDateFilter({startDate: '', endDate: ''}); setFilteredByDate([]); }} className="clear-filter-btn">❌ هەلگرتنی فیلتەر</button>
            </div>
            {filteredByDate.length > 0 && filteredByDate.length !== filteredRecords.length && (
              <div className="filter-info">📊 پێشاندانی {filteredByDate.length} تۆمار لە {dateFilter.startDate} تاکو {dateFilter.endDate}</div>
            )}
          </div>

          <div className="records-section">
            {loading ? <div className="loading">ئامادەکردن...</div> : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>زنجیرە</th><th>ناو</th><th>جۆری ئۆتۆمبێل</th><th>ژمارەی ئۆتۆمبێل</th><th>یەکە</th>
                      <th>پیشە</th><th>مۆلەت پێدەر</th><th>کاتی هاتن</th><th>کاتی دەرچوون</th><th>بەروار</th><th>تێبینی</th><th>پرۆسە</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(filteredByDate.length > 0 ? filteredByDate : filteredRecords).map((record, index) => (
                      <tr key={record.id}>
                        <td>{index + 1}</td><td>{record.person_name || '-'}</td><td>{record.car_model || '-'}</td><td>{record.car_number || '-'}</td>
                        <td>{record.unit || '-'}</td><td>{record.person_type || '-'}</td><td>{record.permit_giver || '-'}</td>
                        <td>{formatGregorianDate(record.entry_time)}</td>
                        <td>{record.exit_time ? formatGregorianDate(record.exit_time) : <button onClick={() => recordExit(record.id)} className="exit-btn">تۆماری دەرچوون</button>}</td>
                        <td>{record.date || '-'}</td><td>{record.notes || '-'}</td><td></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredRecords.length === 0 && <div className="no-data">📭 زانیاریەکان وەرنەگیران</div>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
