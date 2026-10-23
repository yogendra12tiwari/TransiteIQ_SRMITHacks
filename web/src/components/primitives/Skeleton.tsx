import React from "react";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className = "", ...props }: SkeletonProps) {
  return <div aria-hidden="true" className={`bg-[#D8DEE6] rounded-[8px] ${className}`} {...props} />;
}
