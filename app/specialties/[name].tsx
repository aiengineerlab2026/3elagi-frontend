import { Redirect, useLocalSearchParams } from "expo-router";
import React from "react";

/** American spelling alias → canonical `/speciality/[name]`. */
export default function SpecialtiesAliasScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const slug = Array.isArray(name) ? name[0] : name;
  if (!slug) return <Redirect href="/doctors" />;
  return (
    <Redirect
      href={{
        pathname: "/speciality/[name]",
        params: { name: slug },
      }}
    />
  );
}
