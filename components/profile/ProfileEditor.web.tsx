import React, { type ComponentProps } from "react";
import { ProfileEditorWebView } from "./ProfileEditorWebView";

type Props = Omit<ComponentProps<typeof ProfileEditorWebView>, never>;

export function ProfileEditor(props: Props) {
  return <ProfileEditorWebView {...props} />;
}
