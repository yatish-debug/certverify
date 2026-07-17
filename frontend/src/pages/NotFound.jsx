import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { motion } from 'framer-motion';

const NotFound = () => {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-9xl font-extrabold text-slate-200 dark:text-slate-800 tracking-widest">
          404
        </h1>
        <div className="bg-primary-600 text-white px-2 text-sm rounded rotate-12 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          Page Not Found
        </div>
      </motion.div>
      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="mt-8 text-xl text-slate-600 dark:text-slate-400 max-w-md"
      >
        Oops! The page you're looking for seems to have vanished into the digital void.
      </motion.p>
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <Link
          to="/"
          className="mt-8 inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/20"
        >
          <Home className="w-5 h-5" /> Back to Home
        </Link>
      </motion.div>
    </div>
  );
};

export default NotFound;
