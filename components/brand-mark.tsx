/** 麋鹿洞察品牌标识：简化麋鹿角剪影 */
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
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        d="M12 20c-1.8 0-3.2-1.2-3.2-3.1V12.5c0-.4-.2-.8-.5-1L5.8 9.6A1.2 1.2 0 0 1 5.5 8V6.2c0-.7.6-1.2 1.2-1.2.4 0 .8.2 1 .5l1.1 1.4c.3.4.9.5 1.3.2L12 5.5l1.9 1.6c.4.3 1 .2 1.3-.2l1.1-1.4c.2-.3.6-.5 1-.5.7 0 1.2.5 1.2 1.2V8c0 .4-.1.8-.4 1.1l-2.5 1.9c-.3.2-.5.6-.5 1v4.4c0 1.9-1.4 3.1-3.2 3.1Z"
        fill="currentColor"
        opacity="0.95"
      />
      <path
        d="M4.2 7.2c-.9-.4-1.7-1.2-2-2.2M6.5 4.8C5.6 3.6 5.4 2.2 5.6 1M19.8 7.2c.9-.4 1.7-1.2 2-2.2M17.5 4.8c.9-1.2 1.1-2.6.9-3.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M8.8 3.4c-.2-1.1.1-2.2.7-3.1M15.2 3.4c.2-1.1-.1-2.2-.7-3.1"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.75"
      />
    </svg>
  );
}

export const BRAND_NAME = "麋鹿洞察";
export const BRAND_NAME_EN = "InsightElk";
