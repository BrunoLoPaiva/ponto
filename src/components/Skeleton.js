import React from "react";
import "./Skeleton.css";

export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-row">
        <div className="skeleton skeleton-badge" />
        <div className="skeleton skeleton-date" />
      </div>
      <div className="skeleton skeleton-line" />
      <div className="skeleton skeleton-line short" />
      <div className="skeleton skeleton-btn" />
    </div>
  );
}

export function SkeletonGrid({ count = 3 }) {
  return (
    <div className="skeleton-grid">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
