import type { Metadata } from "next";

import { RolePackageRoute } from "@/features/role-packages/RolePackageRoute";
import {
  getRolePackageConfig,
  ROLE_PACKAGE_CONFIGS,
} from "@/features/role-packages/role-package.config";

type PageProps = {
  params: Promise<{ business: string; role: string }>;
};

export function generateStaticParams() {
  return ROLE_PACKAGE_CONFIGS.map(({ business, role }) => ({ business, role }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { business, role } = await params;
  const config = getRolePackageConfig(business, role);
  if (!config) return {};
  return {
    title: config.title,
    description: config.description,
  };
}

export default async function RolePackagePage({ params }: PageProps) {
  return <RolePackageRoute {...await params} />;
}
