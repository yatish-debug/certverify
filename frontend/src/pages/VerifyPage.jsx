import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Search, CheckCircle, XCircle, Download, Calendar, User, Building, Hash, AlertTriangle, Printer, Award, Lock, UploadCloud, Share2, Clock } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import DOMPurify from 'dompurify';
import { verifyCertificate, verifyCertificateByHash } from '../services/api';
import { motion } from 'framer-motion';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const VerifyPage = () => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const printRef = useRef(null);

  // Verification Method and File states
  const [verifyMethod, setVerifyMethod] = useState('id'); // 'id' | 'file'
  const [isDragging, setIsDragging] = useState(false);
  const [fileVerificationLoading, setFileVerificationLoading] = useState(false);

  // Security Lock state
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [hashInput, setHashInput] = useState('');
  const [hashError, setHashError] = useState('');

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    const canvas = await html2canvas(printRef.current, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Certificate_${result.cert_id}.pdf`);
  };

  const executeAction = (actionType, certResult = result) => {
    if (!certResult) return;
    if (actionType === 'view') {
      window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${certResult.file_url}`, '_blank', 'noreferrer');
    } else if (actionType === 'download') {
      handleDownloadPDF();
    } else if (actionType === 'print') {
      window.print();
    }
  };

  const handleActionClick = (actionType) => {
    if (isUnlocked) {
      executeAction(actionType);
    } else {
      setPendingAction(actionType);
      setHashInput('');
      setHashError('');
      setShowUnlockModal(true);
    }
  };

  const handleUnlockSubmit = (e) => {
    e.preventDefault();
    if (hashInput.trim() === result.file_hash) {
      setIsUnlocked(true);
      setShowUnlockModal(false);
      executeAction(pendingAction);
    } else {
      setHashError('Invalid SHA-256 Signature. Please verify and try again.');
    }
  };

  const onSubmit = async (data) => {
    setError(null);
    setResult(null);
    setIsUnlocked(false); // Reset unlock state for new query
    try {
      const res = await verifyCertificate(data.certId);
      setResult(res);
    } catch (err) {
      setError(err.response?.data?.detail || "An error occurred during verification");
    }
  };

  const calculateSHA256 = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  };

  const handleFileVerification = async (file) => {
    if (!file) return;
    setError(null);
    setResult(null);
    setIsUnlocked(false);
    setFileVerificationLoading(true);

    try {
      const hash = await calculateSHA256(file);
      const res = await verifyCertificateByHash(hash);
      setResult(res);
      setIsUnlocked(true); // Possession of authentic file auto-unlocks actions
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Certificate verification by file hash failed. Ensure it has not been tampered with.");
    } finally {
      setFileVerificationLoading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      await handleFileVerification(file);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      await handleFileVerification(file);
    }
  };

  const getStatusConfig = (status) => {
    switch(status) {
      case 'ACTIVE': return { color: 'text-green-500', bg: 'bg-green-100', text: 'Active & Valid', icon: CheckCircle };
      case 'EXPIRED': return { color: 'text-amber-500', bg: 'bg-amber-100', text: 'Expired', icon: AlertTriangle };
      case 'REVOKED': return { color: 'text-red-500', bg: 'bg-red-100', text: 'Revoked', icon: XCircle };
      default: return { color: 'text-slate-500', bg: 'bg-slate-100', text: 'Unknown', icon: AlertTriangle };
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center py-16 px-4">
      <div className="text-center max-w-2xl mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
          Verify Digital Credentials
        </h1>
        <p className="text-lg text-slate-600">
          Secure, instant, and reliable verification of certificates issued by our partnered institutions.
        </p>
      </div>

      <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl shadow-slate-200/60 p-8 border border-slate-100">
        {/* Tab Selector */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => {
              setVerifyMethod('id');
              setError(null);
              setResult(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              verifyMethod === 'id'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Search className="w-4 h-4" />
            Certificate ID
          </button>
          <button
            type="button"
            onClick={() => {
              setVerifyMethod('file');
              setError(null);
              setResult(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              verifyMethod === 'file'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            Verify File
          </button>
        </div>

        {verifyMethod === 'id' ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label htmlFor="certId" className="block text-sm font-medium text-slate-700 mb-1">
                Certificate ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="certId"
                  type="text"
                  className={`block w-full pl-10 pr-3 py-3 border ${errors.certId ? 'border-red-300 focus:ring-red-500' : 'border-slate-300 focus:ring-primary-500'} rounded-xl shadow-sm text-slate-900 transition-colors`}
                  placeholder="e.g. CERT-12345"
                  {...register("certId", { required: "Certificate ID is required" })}
                />
              </div>
              {errors.certId && <p className="mt-1 text-sm text-red-600">{errors.certId.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Verifying...' : 'Verify Certificate'}
            </button>
          </form>
        ) : (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 relative ${
              isDragging
                ? 'border-primary-500 bg-primary-50/50 animate-pulse'
                : 'border-slate-200 hover:border-primary-400 bg-slate-50/30'
            }`}
            onClick={() => document.getElementById('fileInput').click()}
          >
            <input
              id="fileInput"
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              accept=".pdf,image/*"
            />
            {fileVerificationLoading ? (
              <div className="flex flex-col items-center py-6">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mb-4"></div>
                <p className="text-sm font-medium text-slate-700">Computing local cryptographic signature...</p>
                <p className="text-xs text-slate-500 mt-1">This happens locally on your device.</p>
              </div>
            ) : (
              <div className="flex flex-col items-center py-4">
                <div className={`p-4 rounded-full bg-slate-100 text-slate-600 mb-4 transition-transform duration-200 ${isDragging ? 'scale-110 text-primary-600 bg-primary-50' : ''}`}>
                  <UploadCloud className="w-8 h-8" />
                </div>
                <h3 className="text-base font-semibold text-slate-800 mb-1">
                  Drag and drop certificate
                </h3>
                <p className="text-sm text-slate-500 mb-4">
                  or <span className="text-primary-600 font-medium hover:underline">browse files</span> from your computer
                </p>
                <div className="inline-flex gap-2 text-xs text-slate-400 bg-white border border-slate-100 py-1.5 px-3 rounded-lg shadow-sm">
                  <span>PDF, PNG, JPG</span>
                  <span>•</span>
                  <span>Calculates local SHA-256 hash</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {result && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-3xl mt-12 print:mt-0 print:w-full print:max-w-none"
        >
          <div ref={printRef} className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none p-8 border border-slate-100 dark:border-slate-700 relative overflow-hidden print:shadow-none print:border-0 print:p-0">
            
            {result.status === 'REVOKED' && (
              <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none opacity-10">
                <h1 className="text-9xl font-black text-red-600 rotate-[-45deg] tracking-widest uppercase">REVOKED</h1>
              </div>
            )}
            
            <div className="flex flex-col md:flex-row gap-8 relative z-10">
              
              {/* Left Column: Details */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-6">
                  {(() => { const Icon = getStatusConfig(result.status).icon; return <Icon className={`w-8 h-8 ${getStatusConfig(result.status).color}`} />; })()}
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Certificate {getStatusConfig(result.status).text}
                  </h2>
                </div>
                
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
                        <User className="w-4 h-4" /> Candidate Name
                      </div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100 text-lg">{result.candidate_name}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
                        <Building className="w-4 h-4" /> Issuer
                      </div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{result.issuer}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
                        <Calendar className="w-4 h-4" /> Issue Date
                      </div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{new Date(result.issue_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
                        <Calendar className="w-4 h-4" /> Expiry Date
                      </div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{result.expiry_date ? new Date(result.expiry_date).toLocaleDateString() : 'Lifetime'}</p>
                    </div>
                  </div>
                </div>

                {result.description && (
                  <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                    <p 
                      className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed" 
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(result.description) }}
                    />
                  </div>
                )}
                
                <div className="mt-6">
                  <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
                    <Hash className="w-4 h-4" /> SHA-256 Signature
                  </div>
                  <p className="font-mono text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/50 p-2 rounded-lg break-all">
                    {result.file_hash}
                  </p>
                </div>
                {result.history && result.history.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                      <Clock className="w-5 h-5 text-primary-600" /> Audit Timeline
                    </h3>
                    <div className="relative border-l-2 border-slate-200 dark:border-slate-700 ml-3 space-y-4">
                      {result.history.map((log, index) => (
                        <div key={index} className="relative pl-6">
                          <div className="absolute w-3 h-3 bg-primary-500 rounded-full -left-[7px] top-1.5 border-2 border-white dark:border-slate-800"></div>
                          <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{log.action.replace(/_/g, ' ')}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{new Date(log.timestamp).toLocaleString()} • IP: {log.ip_address}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: QR Code & Actions */}
              <div className="md:w-64 flex flex-col items-center justify-start border-t md:border-t-0 md:border-l border-slate-200 pt-6 md:pt-0 md:pl-8">
                <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 mb-4 inline-block">
                  <QRCodeSVG 
                    value={`${window.location.origin}/verify?certId=${result.cert_id}`} 
                    size={160} 
                    fgColor={result.qr_fg_color || '#0F172A'}
                    bgColor={result.qr_bg_color || '#FFFFFF'}
                  />
                </div>
                <p className="text-xs text-slate-500 mb-6 text-center">Scan to verify this certificate</p>
                
                <div className="w-full space-y-3 print:hidden">
                  <button 
                    onClick={() => handleActionClick('view')}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 border-2 border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm"
                  >
                    {!isUnlocked && <Lock className="w-4 h-4 text-slate-400" />} View Original
                  </button>
                  <button 
                    onClick={() => handleActionClick('download')}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors shadow-md shadow-slate-900/20 text-sm"
                  >
                    {isUnlocked ? <Download className="w-4 h-4" /> : <Lock className="w-4 h-4" />} Download PDF
                  </button>
                  <button 
                    onClick={() => handleActionClick('print')}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors shadow-md shadow-primary-600/20 text-sm"
                  >
                    {isUnlocked ? <Printer className="w-4 h-4" /> : <Lock className="w-4 h-4" />} Print Certificate
                  </button>
                  <button 
                    onClick={() => {
                      const url = `${window.location.origin}/verify?certId=${result.cert_id}`;
                      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-[#0A66C2] text-white rounded-xl font-medium hover:bg-[#004182] transition-colors shadow-md shadow-[#0A66C2]/20 text-sm"
                  >
                    <Share2 className="w-4 h-4" /> Share on LinkedIn
                  </button>
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 w-full flex flex-col items-center">
                    <Award className={`w-8 h-8 mb-2 ${getStatusConfig(result.status).color}`} />
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Verified by CertVerify</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </motion.div>
      )}

      {error && (
        <div className="w-full max-w-xl mt-12 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex flex-col items-center text-center">
            <XCircle className="w-12 h-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-red-900 mb-2">Verification Failed</h3>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {showUnlockModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowUnlockModal(false)} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10 border border-slate-100 p-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex flex-col items-center text-center">
                <div className="p-3 bg-primary-50 rounded-full text-primary-600 mb-4">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Security Verification Required</h3>
                <p className="text-sm text-slate-500 mb-6">
                  Please enter the SHA-256 signature to verify you have authorization to view, download, or print this certificate.
                </p>
                <form onSubmit={handleUnlockSubmit} className="w-full space-y-4">
                  <div>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                      placeholder="Enter SHA-256 Signature"
                      value={hashInput}
                      onChange={(e) => {
                        setHashInput(e.target.value);
                        setHashError('');
                      }}
                      autoFocus
                    />
                    {hashError && (
                      <p className="text-xs text-red-600 text-left mt-1.5 font-medium">{hashError}</p>
                    )}
                  </div>
                  <div className="flex gap-3 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setShowUnlockModal(false)}
                      className="flex-1 py-2 text-sm text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 text-sm text-white bg-primary-600 hover:bg-primary-700 rounded-xl font-medium transition-colors shadow-lg shadow-primary-600/20"
                    >
                      Verify & Unlock
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerifyPage;
