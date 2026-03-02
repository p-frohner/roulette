export const formatAmount = (cents: number): string => {
	const dollars = cents / 100;

	if (dollars < 1000) {
		return `$${dollars}`;
	}
	const k = dollars / 1000;
	if (k >= 10) {
		return `$${Math.round(k)}k`;
	}
	// 1 <= k < 10: 1 decimal, drop if whole
	const kRounded = Math.round(k * 10) / 10;
	return kRounded % 1 === 0 ? `$${kRounded}k` : `$${kRounded.toFixed(1)}k`;
};
