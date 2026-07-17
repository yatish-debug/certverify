import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getDashboardStats, getCertificates, createCertificate, deleteCertificate, updateCertificate, getAuditLogs, getProfile, setupMfa, enableMfa, disableMfa } from '../services/api';
import { Users, FileCheck, AlertTriangle, Plus, Search, Trash2, Download, X, ShieldX, Pencil } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { QRCodeSVG } from 'qrcode.react';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('certificates');
  const [stats, setStats] = useState({ total_certificates: 0, active_certificates: 0, expired_certificates: 0, revoked_certificates: 0 });
  const [certificates, setCertificates] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editCert, setEditCert] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [statsData, certsData, logsData] = await Promise.all([
        getDashboardStats(),
        getCertificates(search),
        getAuditLogs(50)
      ]);
      setStats(statsData);
      setCertificates(Array.isArray(certsData) ? certsData : (certsData.items || []));
      setAuditLogs(Array.isArray(logsData) ? logsData : (logsData.items || logsData.logs || []));
    } catch (error) {
      console.error("Error fetching dashboard data", error);
    }
  }, [search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (certId) => {
    if (window.confirm(`Delete certificate "${certId}"? This cannot be undone.`)) {
      try {
        await deleteCertificate(certId);
        fetchData();
      } catch (error) {
        alert(error.response?.data?.detail || "Failed to delete certificate.");
      }
    }
  };

  const chartData = [
    { name: 'Active', value: stats.active_certificates, fill: '#22c55e' },
    { name: 'Expired', value: stats.expired_certificates, fill: '#f59e0b' },
    { name: 'Revoked', value: stats.revoked_certificates, fill: '#ef4444' }
  ];

  const exportLogsToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Security Audit Logs", 14, 15);
    
    const tableColumn = ["Timestamp", "Action", "User", "IP Address", "Details"];
    const tableRows = [];

    auditLogs.forEach(log => {
      const logData = [
        new Date(log.timestamp).toLocaleString(),
        log.action,
        log.admin_username || 'Public',
        log.ip_address,
        log.details
      ];
      tableRows.push(logData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
    
    doc.save("audit_logs.pdf");
  };

  return (
    <div className="space-y-6">
      <div className="flex border-b border-slate-200 mb-6">
        {['certificates', 'analytics', 'audit', 'security'].map(tab => (
          <button key={tab}
            className={`px-4 py-2 font-medium text-sm capitalize transition-colors ${activeTab === tab ? 'border-b-2 border-primary-600 text-primary-600' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setActiveTab(tab)}
          >{tab === 'audit' ? 'Audit Logs' : tab.charAt(0).toUpperCase() + tab.slice(1)}</button>
        ))}
      </div>

      {activeTab === 'analytics' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            <StatCard title="Total Certificates" value={stats.total_certificates} icon={<Users className="w-6 h-6 text-blue-500" />} bg="bg-blue-50" />
            <StatCard title="Active" value={stats.active_certificates} icon={<FileCheck className="w-6 h-6 text-green-500" />} bg="bg-green-50" />
            <StatCard title="Expired" value={stats.expired_certificates} icon={<AlertTriangle className="w-6 h-6 text-amber-500" />} bg="bg-amber-50" />
            <StatCard title="Revoked" value={stats.revoked_certificates} icon={<ShieldX className="w-6 h-6 text-red-500" />} bg="bg-red-50" />
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-6">Certificate Distribution</h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in">
          <div className="p-6 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-800">Security Audit Logs</h3>
            <button 
              onClick={exportLogsToPDF}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" /> Export PDF
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {['Timestamp', 'Action', 'User', 'IP Address', 'Details'].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-xs">{log.action}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{log.admin_username || 'Public'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">{log.ip_address}</td>
                    <td className="px-6 py-4 text-sm text-slate-700 truncate max-w-xs">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <SecurityTab />
      )}

      {activeTab === 'certificates' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in">
          <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full sm:w-96">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-1 focus:ring-primary-500 sm:text-sm"
                placeholder="Search by ID or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> Issue Certificate
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Cert ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Candidate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Issuer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Issue Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {certificates.map((cert) => (
                  <tr key={cert.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 font-mono">{cert.cert_id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{cert.candidate_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{cert.issuer}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{cert.issue_date ? new Date(cert.issue_date).toLocaleDateString() : '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${cert.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : cert.status === 'EXPIRED' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                        {cert.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-3">
                        <a href={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${cert.file_url}`} target="_blank" rel="noreferrer" className="text-primary-600 hover:text-primary-900" title="View File">
                          <Download className="w-5 h-5" />
                        </a>
                        <button onClick={() => setEditCert(cert)} className="text-amber-500 hover:text-amber-700" title="Edit">
                          <Pencil className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleDelete(cert.cert_id)} className="text-red-600 hover:text-red-900" title="Delete">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {certificates.length === 0 && (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">No certificates found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CreateModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={fetchData} />
      <EditModal cert={editCert} onClose={() => setEditCert(null)} onSuccess={fetchData} />
    </div>
  );
};

const StatCard = ({ title, value, icon, bg }) => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex items-center">
    <div className={`p-4 rounded-xl ${bg} mr-4`}>{icon}</div>
    <div>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  </div>
);

const FIELD_CLASS = "w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm";

const CreateModal = ({ isOpen, onClose, onSuccess }) => {
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();
  if (!isOpen) return null;

  const onSubmit = async (data) => {
    try {
      const fd = new FormData();
      if (data.cert_id?.trim()) fd.append('cert_id', data.cert_id.trim().toUpperCase());
      fd.append('candidate_name', data.candidate_name);
      fd.append('issuer', data.issuer);
      fd.append('issue_date', data.issue_date);
      if (data.expiry_date) fd.append('expiry_date', data.expiry_date);
      if (data.description) fd.append('description', data.description);
      if (data.qr_fg_color) fd.append('qr_fg_color', data.qr_fg_color);
      if (data.qr_bg_color) fd.append('qr_bg_color', data.qr_bg_color);
      fd.append('file', data.file[0]);
      await createCertificate(fd);
      reset(); onSuccess(); onClose();
    } catch (e) { alert(e.response?.data?.detail || "Failed to issue certificate."); }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg z-10">
          <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-900">Issue New Certificate</h3>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Certificate ID <span className="text-slate-400 font-normal">(leave blank to auto-generate)</span></label>
                <input type="text" className={`${FIELD_CLASS} font-mono uppercase`} placeholder="e.g. CERT-2026-NASA" {...register("cert_id")} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Candidate Name *</label>
                <input type="text" className={FIELD_CLASS} {...register("candidate_name", { required: true })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Issuer *</label>
                <input type="text" className={FIELD_CLASS} {...register("issuer", { required: true })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Issue Date *</label>
                  <input type="date" className={FIELD_CLASS} {...register("issue_date", { required: true })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Expiry Date</label>
                  <input type="date" className={FIELD_CLASS} {...register("expiry_date")} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea className={FIELD_CLASS} rows="2" {...register("description")} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">QR Foreground</label>
                  <input type="color" className="w-full h-10 p-1 border border-slate-300 rounded-xl cursor-pointer" defaultValue="#0F172A" {...register("qr_fg_color")} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">QR Background</label>
                  <input type="color" className="w-full h-10 p-1 border border-slate-300 rounded-xl cursor-pointer" defaultValue="#FFFFFF" {...register("qr_bg_color")} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Certificate File (PDF/PNG/JPEG) *</label>
                <input type="file" accept=".pdf,image/png,image/jpeg" className={FIELD_CLASS} {...register("file", { required: true })} />
              </div>
            </div>
            <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 rounded-b-2xl border-t border-slate-200">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm text-white bg-primary-600 rounded-xl hover:bg-primary-700 disabled:opacity-70">
                {isSubmitting ? 'Issuing...' : 'Issue Certificate'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const EditModal = ({ cert, onClose, onSuccess }) => {
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  useEffect(() => {
    if (cert) {
      reset({
        candidate_name: cert.candidate_name,
        issuer: cert.issuer,
        issue_date: cert.issue_date,
        expiry_date: cert.expiry_date || '',
        description: cert.description || '',
        status: cert.status,
        qr_fg_color: cert.qr_fg_color || '#0F172A',
        qr_bg_color: cert.qr_bg_color || '#FFFFFF',
      });
    }
  }, [cert, reset]);

  if (!cert) return null;

  const onSubmit = async (data) => {
    try {
      const fd = new FormData();
      fd.append('candidate_name', data.candidate_name);
      fd.append('issuer', data.issuer);
      fd.append('issue_date', data.issue_date);
      if (data.expiry_date) fd.append('expiry_date', data.expiry_date);
      if (data.description) fd.append('description', data.description);
      if (data.qr_fg_color) fd.append('qr_fg_color', data.qr_fg_color);
      if (data.qr_bg_color) fd.append('qr_bg_color', data.qr_bg_color);
      fd.append('status', data.status);
      await updateCertificate(cert.cert_id, fd);
      onSuccess(); onClose();
    } catch (e) { alert(e.response?.data?.detail || "Failed to update certificate."); }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg z-10">
          <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Edit Certificate</h3>
              <p className="text-xs font-mono text-slate-400 mt-0.5">{cert.cert_id}</p>
            </div>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Candidate Name *</label>
                <input type="text" className={FIELD_CLASS} {...register("candidate_name", { required: true })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Issuer *</label>
                <input type="text" className={FIELD_CLASS} {...register("issuer", { required: true })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Issue Date *</label>
                  <input type="date" className={FIELD_CLASS} {...register("issue_date", { required: true })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Expiry Date</label>
                  <input type="date" className={FIELD_CLASS} {...register("expiry_date")} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select className={FIELD_CLASS} {...register("status")}>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="EXPIRED">EXPIRED</option>
                  <option value="REVOKED">REVOKED</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea className={FIELD_CLASS} rows="2" {...register("description")} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">QR Foreground</label>
                  <input type="color" className="w-full h-10 p-1 border border-slate-300 rounded-xl cursor-pointer" {...register("qr_fg_color")} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">QR Background</label>
                  <input type="color" className="w-full h-10 p-1 border border-slate-300 rounded-xl cursor-pointer" {...register("qr_bg_color")} />
                </div>
              </div>
            </div>
            <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 rounded-b-2xl border-t border-slate-200">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm text-white bg-amber-500 rounded-xl hover:bg-amber-600 disabled:opacity-70">
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const SecurityTab = () => {
  const [profile, setProfile] = useState(null);
  const [mfaSetup, setMfaSetup] = useState(null);
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchProfile = async () => {
    try {
      const p = await getProfile();
      setProfile(p);
    } catch (e) {
      console.error(e);
      setError("Failed to fetch profile");
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  const handleSetup = async () => {
    try {
      setLoading(true);
      const setup = await setupMfa();
      setMfaSetup(setup);
    } catch (e) {
      console.error(e);
      setError("Failed to setup MFA");
    } finally {
      setLoading(false);
    }
  };

  const handleEnable = async () => {
    try {
      setLoading(true);
      await enableMfa(mfaSetup.secret, otpCode);
      setMfaSetup(null);
      setOtpCode('');
      fetchProfile();
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to enable MFA");
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (window.confirm("Are you sure you want to disable MFA?")) {
      try {
        setLoading(true);
        await disableMfa();
        fetchProfile();
      } catch (e) {
        console.error(e);
        setError("Failed to disable MFA");
      } finally {
        setLoading(false);
      }
    }
  };

  if (!profile) return <div>Loading...</div>;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-8">
      <h3 className="text-xl font-semibold text-slate-800 mb-2">Account Security</h3>
      <p className="text-slate-500 mb-8">Manage your two-factor authentication settings.</p>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-6">{error}</div>}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 border border-slate-200 rounded-xl bg-slate-50 gap-4">
        <div>
          <h4 className="font-semibold text-slate-800">Multi-Factor Authentication (MFA)</h4>
          <p className="text-sm text-slate-500 mt-1">
            {profile.mfa_enabled 
              ? "Your account is secured with two-factor authentication." 
              : "Enhance your account security by enabling two-factor authentication."}
          </p>
        </div>
        <div>
          {profile.mfa_enabled ? (
            <button onClick={handleDisable} disabled={loading} className="px-4 py-2 bg-red-100 text-red-600 font-medium rounded-xl hover:bg-red-200 transition-colors whitespace-nowrap">
              Disable MFA
            </button>
          ) : (
            <button onClick={handleSetup} disabled={loading || mfaSetup} className="px-4 py-2 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors whitespace-nowrap">
              Set up MFA
            </button>
          )}
        </div>
      </div>

      {mfaSetup && (
        <div className="mt-8 p-6 border border-slate-200 rounded-xl animate-in fade-in slide-in-from-top-4">
          <h4 className="font-semibold text-slate-800 mb-4">Complete MFA Setup</h4>
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
              <QRCodeSVG value={mfaSetup.otpauth_url} size={150} />
            </div>
            <div className="flex-1 space-y-4">
              <p className="text-sm text-slate-600">1. Scan the QR code with an authenticator app (e.g. Google Authenticator, Authy).</p>
              <p className="text-sm text-slate-600">2. Enter the 6-digit code generated by your app below.</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input 
                  type="text" 
                  className="px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 w-full sm:w-32 text-center font-mono tracking-widest outline-none"
                  placeholder="000000"
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value)}
                />
                <button 
                  onClick={handleEnable}
                  disabled={loading || otpCode.length !== 6}
                  className="px-4 py-2 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  Verify & Enable
                </button>
                <button 
                  onClick={() => setMfaSetup(null)}
                  className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors whitespace-nowrap"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
