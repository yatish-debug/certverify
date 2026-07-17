import React from 'react';
import { motion } from 'framer-motion';

const Skeleton = ({ className }) => (
  <motion.div
    className={`bg-slate-200 dark:bg-slate-700 rounded ${className}`}
    animate={{ opacity: [0.5, 1, 0.5] }}
    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
  />
);

export default Skeleton;
