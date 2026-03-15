'use client';

import { useState } from 'react';
import Link from 'next/link';
import Logo from './Logo';

const navLinks = [
  { href: '/', label: '首页' },
  { href: '/search', label: '产品库' },
  { href: '/#tools', label: '工具箱' },
  { href: '/coming-soon', label: '知识库' },
  { href: '/coming-soon', label: '关于' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="bg-[#1B2B4B] text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4">
        <nav className="flex items-center justify-between h-16">
          {/* Logo + brand */}
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <Logo size={36} />
            <span className="text-lg font-bold tracking-wide">专汽智云</span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link, i) => (
              <Link
                key={`${link.href}-${i}`}
                href={link.href}
                className="px-4 py-2 rounded text-sm font-medium text-white/90 hover:text-[#2D8CA0] hover:bg-white/10 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* CTA button */}
          <Link
            href="/search"
            className="hidden md:inline-flex items-center bg-[#2D8CA0] hover:bg-[#3AAFC9] text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
          >
            立即查询
          </Link>

          {/* Mobile hamburger */}
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 rounded hover:bg-white/10 transition-colors"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {open ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </nav>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden border-t border-white/10 py-3 space-y-1">
            {navLinks.map((link, i) => (
              <Link
                key={`${link.href}-${i}`}
                href={link.href}
                onClick={() => setOpen(false)}
                className="block px-4 py-2 rounded text-sm hover:bg-white/10 transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/search"
              onClick={() => setOpen(false)}
              className="block mx-4 mt-2 text-center bg-[#2D8CA0] hover:bg-[#3AAFC9] text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
            >
              立即查询
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
