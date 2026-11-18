import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import "./page-navigation.scss";

type Props = {
  to: string;
  label: string;
  children?: ReactNode;
};

export default function PageNavigation({ to, label, children }: Props) {
  const { t } = useTranslation();

  return (
    <nav className="trpg-page-nav" aria-label={t("navigation.page")}>
      <Link to={to}><ArrowLeft size={16} aria-hidden="true" />{label}</Link>
      {children && <div className="trpg-page-nav__actions">{children}</div>}
    </nav>
  );
}
