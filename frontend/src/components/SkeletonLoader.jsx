import React from 'react';

// Base skeleton component
export const Skeleton = ({ className = '', variant = 'rectangular' }) => {
  const baseClasses = 'animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%]';

  const variantClasses = {
    rectangular: 'rounded',
    circular: 'rounded-full',
    text: 'rounded h-4',
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={{
        animation: 'shimmer 2s infinite',
      }}
    />
  );
};

// Portfolio card skeleton
export const PortfolioCardSkeleton = () => (
  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
    <div className="flex justify-between items-start">
      <div className="space-y-2 flex-1">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="h-8 w-20" />
    </div>
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  </div>
);

// Stats card skeleton
export const StatsCardSkeleton = () => (
  <div className="glass-card p-6 rounded-lg space-y-3">
    <Skeleton className="h-4 w-24" />
    <Skeleton className="h-8 w-32" />
    <Skeleton className="h-3 w-20" />
  </div>
);

// Table row skeleton
export const TableRowSkeleton = ({ cols = 5 }) => (
  <tr className="border-b">
    {[...Array(cols)].map((_, i) => (
      <td key={i} className="px-6 py-4">
        <Skeleton className="h-4 w-full" />
      </td>
    ))}
  </tr>
);

// Dashboard overview skeleton
export const DashboardSkeleton = () => (
  <div className="space-y-6">
    {/* Header */}
    <div className="flex justify-between items-center">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-10 w-32" />
    </div>

    {/* Stats cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatsCardSkeleton />
      <StatsCardSkeleton />
      <StatsCardSkeleton />
      <StatsCardSkeleton />
    </div>

    {/* Portfolio cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <PortfolioCardSkeleton />
      <PortfolioCardSkeleton />
    </div>

    {/* Holdings table */}
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-4 border-b">
        <Skeleton className="h-6 w-48" />
      </div>
      <table className="w-full">
        <tbody>
          <TableRowSkeleton cols={6} />
          <TableRowSkeleton cols={6} />
          <TableRowSkeleton cols={6} />
          <TableRowSkeleton cols={6} />
          <TableRowSkeleton cols={6} />
        </tbody>
      </table>
    </div>
  </div>
);

// Transaction skeleton
export const TransactionsSkeleton = () => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-10 w-40" />
    </div>

    {/* Summary cards */}
    <div className="grid grid-cols-5 gap-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="p-4 rounded-lg border">
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-8 w-24" />
        </div>
      ))}
    </div>

    {/* Table */}
    <div className="bg-white rounded-lg border overflow-hidden">
      <table className="w-full">
        <tbody>
          <TableRowSkeleton cols={7} />
          <TableRowSkeleton cols={7} />
          <TableRowSkeleton cols={7} />
        </tbody>
      </table>
    </div>
  </div>
);

// Performance report skeleton
export const PerformanceReportSkeleton = () => (
  <div className="space-y-8">
    <div className="flex justify-between items-center">
      <div>
        <Skeleton className="h-10 w-64 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="h-10 w-32" />
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatsCardSkeleton />
      <StatsCardSkeleton />
      <StatsCardSkeleton />
      <StatsCardSkeleton />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="glass-card p-6 space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
      <div className="glass-card p-6 space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  </div>
);

export default Skeleton;
