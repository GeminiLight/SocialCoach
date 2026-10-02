type ReplyKey = { key: string; shiftKey: boolean; ctrlKey: boolean; metaKey: boolean; isComposing: boolean; keyCode?: number };

// Desktop Enter submits; composition confirmation and mobile return remain text input.
export function shouldSubmitReply(key: ReplyKey, finePointer: boolean) {
  return key.key === 'Enter' && !key.isComposing && key.keyCode !== 229 &&
    (key.ctrlKey || key.metaKey || (finePointer && !key.shiftKey));
}
