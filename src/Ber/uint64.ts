/** All 64 bits set; `& MASK_64` truncates a bigint to an unsigned 64-bit value. */
export const MASK_64 = 0xffff_ffff_ffff_ffffn

/** Left shift with unsigned 64-bit wraparound. */
export function shl64(value: bigint, bits: bigint): bigint {
	return (value << bits) & MASK_64
}
