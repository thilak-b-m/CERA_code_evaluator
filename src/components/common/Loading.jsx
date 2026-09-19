import { motion } from 'framer-motion';

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`bg-cera-card border border-cera-border rounded-xl p-5 ${className}`}>
      <div className="space-y-3">
        <div className="h-4 bg-cera-elevated rounded animate-pulse w-1/3" />
        <div className="h-8 bg-cera-elevated rounded animate-pulse w-2/3" />
        <div className="h-3 bg-cera-elevated rounded animate-pulse w-1/2" />
      </div>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-cera-border">
      <div className="h-10 w-10 bg-cera-elevated rounded-lg animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-cera-elevated rounded animate-pulse w-1/4" />
        <div className="h-3 bg-cera-elevated rounded animate-pulse w-1/2" />
      </div>
      <div className="h-6 w-20 bg-cera-elevated rounded-full animate-pulse" />
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="bg-cera-card border border-cera-border rounded-xl p-5">
      <div className="h-5 bg-cera-elevated rounded animate-pulse w-1/4 mb-4" />
      <div className="h-64 bg-cera-elevated rounded animate-pulse" />
    </div>
  );
}

export default function Loading({ type = 'cards', count = 6 }) {
  if (type === 'cards') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (type === 'rows') {
    return (
      <div className="bg-cera-card border border-cera-border rounded-xl overflow-hidden">
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    );
  }

  if (type === 'chart') {
    return <SkeletonChart />;
  }

  if (type === 'spinner') {
    return (
      <div className="flex items-center justify-center py-12">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-cera-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-12">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="w-8 h-8 border-2 border-cera-primary border-t-transparent rounded-full"
      />
    </div>
  );
}
