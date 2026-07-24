/** InsightElk brand mark: front-facing elk head silhouette */
export function BrandMark({
  size = 18,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {/* palmated antlers */}
      <path
        fill="currentColor"
        d="M4 8.5c0-2.2 1.5-4.2 3.4-4.8 1.2 1.8 2.2 2.8 3.6 3.4-.4-1.6-.2-3.3.8-4.6 1.3.6 2.3 1.8 2.7 3.3.5-.9 1.3-1.6 2.3-1.9.3 1.2.2 2.4-.3 3.4H15.2c-.5-1-.6-2.2-.3-3.4 1 .3 1.8 1 2.3 1.9.4-1.5 1.4-2.7 2.7-3.3 1 1.3 1.2 3 .8 4.6 1.4-.6 2.4-1.6 3.6-3.4 1.9.6 3.4 2.6 3.4 4.8 0 1.1-.4 2.1-1.1 2.9-1.3-.3-2.5-.2-3.6.3.8.4 1.4 1 1.8 1.8-.9.6-2 .8-3.1.6V14h-1.6c0-1.2-.4-2.2-1.1-3H17c-.7.8-1.1 1.8-1.1 3h-1.6v-.9c-1.1.2-2.2 0-3.1-.6.4-.8 1-1.4 1.8-1.8-1.1-.5-2.3-.6-3.6-.3C4.4 10.6 4 9.6 4 8.5Z"
      />
      {/* head + snout */}
      <path
        fill="currentColor"
        d="M11.2 14.2c0-1.3.8-2.4 2-2.9.8-.3 1.7-.3 2.5 0h.6c.8-.3 1.7-.3 2.5 0 1.2.5 2 1.6 2 2.9v3.2c0 .7-.3 1.3-.8 1.7l-1.4 1.1v4.6c0 1.8-1.5 2.8-3.1 2.8s-3.1-1-3.1-2.8v-4.6l-1.4-1.1c-.5-.4-.8-1-.8-1.7v-3.2Z"
      />
      {/* ears */}
      <path
        fill="currentColor"
        d="M9.8 15.2c-.9-.2-1.7.4-1.9 1.2-.2.7.3 1.4 1.1 1.6l.8-2.8ZM22.2 15.2c.9-.2 1.7.4 1.9 1.2.2.7-.3 1.4-1.1 1.6l-.8-2.8Z"
      />
    </svg>
  );
}

export const BRAND_NAME = "InsightElk";
export const BRAND_NAME_EN = "InsightElk";
