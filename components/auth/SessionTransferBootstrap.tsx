/** Native builds do not consume cross-domain `_st` transfers. */
export function SessionTransferBootstrap() {
  return null;
}
