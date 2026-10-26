export function Logo({ size = 112, className = "" }: { size?: number; className?: string }) {
  return (
    <img
      src="/logo-lugar-dellas.jpg"
      alt="Lugar Dellas Studio Beauty"
      width={size}
      height={size}
      className={`rounded-full bg-white object-cover ${className}`}
    />
  );
}
