import Image from 'next/image';

export default function Logo({ className = '', size = 48 }: { className?: string; size?: number }) {
  return (
    <Image
      src="/logo.png"
      alt="SPV Cloud Logo"
      width={Math.round(size * 1.8)}
      height={size}
      className={className}
      style={{ height: size, width: 'auto' }}
      priority
    />
  );
}
