import Link from "next/link";
import styles from "./DashboardOverview.module.css";

export function AccountFooter() {
  return <footer className={styles.accountFooter}><span>© {new Date().getFullYear()} Ofissio Workwear</span><nav aria-label="Informasi akun"><Link href="/legal/privacy-policy">Privasi</Link><Link href="/legal/terms-of-service">Syarat layanan</Link><a href="mailto:sales@ofissio.com">Hubungi Ofissio</a></nav></footer>;
}
