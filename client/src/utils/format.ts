export const formatAmount = (cents: number): string => {
	const dollars = Math.round(cents / 100);
	return `$${dollars.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
};
