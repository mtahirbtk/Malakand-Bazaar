export function formatPkr(value: number): string {
  return `PKR ${Math.round(value).toLocaleString("en-US")}`;
}
