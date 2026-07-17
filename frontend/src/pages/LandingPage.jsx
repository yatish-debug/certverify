import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Lock, Search, FileSignature } from 'lucide-react';
import { Link } from 'react-router-dom';

const LandingPage = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      {/* Hero Section */}
      <div className="relative overflow-hidden pt-32 pb-20 lg:pt-48 lg:pb-32">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-primary-100/50 to-transparent dark:from-primary-900/20 pointer-events-none rounded-full blur-3xl opacity-50"></div>
        <motion.div 
          className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-sm font-medium mb-8">
            <ShieldCheck className="w-4 h-4" /> Enterprise Security
          </motion.div>
          <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-8">
            Cryptographically Secure <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-blue-600 dark:from-primary-400 dark:to-blue-400">
              Credential Verification
            </span>
          </motion.h1>
          <motion.p variants={itemVariants} className="max-w-2xl mx-auto text-xl text-slate-600 dark:text-slate-400 mb-10">
            Instantly verify digital certificates issued by authorized institutions. Backed by SHA-256 integrity checks and enterprise-grade infrastructure.
          </motion.p>
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/verify" className="inline-flex justify-center items-center gap-2 px-8 py-4 rounded-full bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/30">
              <Search className="w-5 h-5" /> Verify a Certificate
            </Link>
            <Link to="/admin/login" className="inline-flex justify-center items-center gap-2 px-8 py-4 rounded-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm border border-slate-200 dark:border-slate-700">
              <Lock className="w-5 h-5" /> Admin Portal
            </Link>
          </motion.div>
        </motion.div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-white dark:bg-slate-800/50 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Flagship Features</h2>
            <p className="mt-4 text-slate-600 dark:text-slate-400">Built for scale, security, and exceptional user experience.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<FileSignature />} 
              title="SHA-256 Integrity" 
              desc="Every certificate is hashed upon upload. The verification engine checks the hash against the file on disk to guarantee zero tampering." 
            />
            <FeatureCard 
              icon={<ShieldCheck />} 
              title="Bank-Grade Security" 
              desc="Powered by JWT Refresh Tokens, RBAC, Rate Limiting, and strict CSP headers to protect sensitive admin operations." 
            />
            <FeatureCard 
              icon={<Search />} 
              title="Instant Verification" 
              desc="Scan QR codes or enter credentials to instantly check status (Active, Expired, Revoked) without complex workflows." 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const FeatureCard = ({ icon, title, desc }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700"
  >
    <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 rounded-xl flex items-center justify-center mb-6">
      {React.cloneElement(icon, { className: "w-6 h-6" })}
    </div>
    <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">{title}</h3>
    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{desc}</p>
  </motion.div>
);

export default LandingPage;
