'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Activity, ArrowRight, Bell, BrainCircuit, ChevronDown, CircleDollarSign,
  CreditCard, LayoutDashboard, Menu, Moon, PiggyBank, ReceiptText, Search,
  ShieldCheck, Sun, TrendingDown, TrendingUp, WalletCards,
} from 'lucide-react';
import styles from './PublicOverview.module.css';

type Theme = 'dark' | 'light';

function getSavedTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  return window.localStorage.getItem('finpulse-theme') === 'light' ? 'light' : 'dark';
}

const transactions = [
  ['Swiggy Instamart', 'Food & Dining', '−₹1,840'],
  ['Uber Ride', 'Transport', '−₹428'],
  ['Salary Credit', 'Income', '+₹65,000'],
  ['BESCOM Electricity', 'Bills', '−₹2,140'],
];

export default function PublicOverview() {
  const [theme, setTheme] = useState<Theme>(getSavedTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  function toggleTheme() {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    window.localStorage.setItem('finpulse-theme', nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.style.colorScheme = nextTheme;
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="FinPulse home">
          <span><Activity size={22}/></span>FinPulse
        </Link>
        <nav className={styles.nav} aria-label="Main navigation">
          <a href="#preview">Overview</a>
          <a href="#features">Features</a>
          <a href="#security">Security</a>
        </nav>
        <div className={styles.headerActions}>
          <button className={styles.themeButton} type="button" onClick={toggleTheme} aria-label={`Use ${theme === 'dark' ? 'light' : 'dark'} theme`}>
            {theme === 'dark' ? <Sun size={17}/> : <Moon size={17}/>}<span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>
          <Link className={styles.signIn} href="/login">Sign in</Link>
          <Link className={styles.getStarted} href="/login">Get started <ArrowRight size={16}/></Link>
        </div>
        <Link className={styles.mobileCta} href="/login"><Menu size={20}/><span className={styles.srOnly}>Open sign in</span></Link>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroGlow}/>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}><BrainCircuit size={16}/> AI-powered personal finance</p>
          <h1>See where your money goes. <span>Know what to do next.</span></h1>
          <p className={styles.heroText}>FinPulse brings spending, savings, budgets, and financial guidance into one clear dashboard built for everyday decisions.</p>
          <div className={styles.heroActions}>
            <Link className={styles.getStarted} href="/login">Open your dashboard <ArrowRight size={17}/></Link>
            <a className={styles.demoLink} href="#preview">Explore the preview</a>
          </div>
          <div className={styles.trustStrip}>
            <span><ShieldCheck size={16}/> Secure Supabase account</span>
            <span><CircleDollarSign size={16}/> Indian currency ready</span>
            <span><ReceiptText size={16}/> Voice and CSV expenses</span>
          </div>
        </div>
      </section>

      <section className={styles.previewSection} id="preview">
        <div className={styles.sectionHeading}>
          <div><p className={styles.eyebrow}>Product overview</p><h2>Your full financial picture, at a glance.</h2></div>
          <span className={styles.demoBadge}>Demo data preview</span>
        </div>

        <div className={styles.dashboardFrame}>
          <aside className={styles.sidebar}>
            <div className={styles.sideBrand}><Activity size={21}/>FinPulse</div>
            <div className={`${styles.sideItem} ${styles.sideActive}`}><LayoutDashboard/>Overview</div>
            <div className={styles.sideItem}><ReceiptText/>Transactions</div>
            <div className={styles.sideItem}><WalletCards/>Accounts</div>
            <div className={styles.sideItem}><BrainCircuit/>AI Insights</div>
            <div className={styles.sideItem}><CreditCard/>Credit Health</div>
            <div className={styles.sideSecurity}><ShieldCheck/><span><strong>Your data stays yours</strong><small>Protected account access</small></span></div>
          </aside>

          <div className={styles.workspace}>
            <div className={styles.topbar}>
              <div className={styles.search}><Search/>Search transactions, merchants, accounts…</div>
              <Bell className={styles.bell}/><span className={styles.avatar}>PS</span><strong>Priya Shah</strong><ChevronDown size={14}/>
            </div>
            <div className={styles.dashboardBody}>
              <div className={styles.metricGrid}>
                <article className={styles.metric}><span>Total balance</span><strong>₹2,45,304</strong><small className={styles.positive}><TrendingUp/> 3.2% this month</small><i className={styles.blue}><WalletCards/></i></article>
                <article className={styles.metric}><span>Monthly spend</span><strong>₹32,587</strong><small className={styles.positive}><TrendingDown/> 8.7% this month</small><i className={styles.violet}><CreditCard/></i></article>
                <article className={styles.metric}><span>Income</span><strong>₹65,000</strong><small className={styles.positive}><TrendingUp/> 5.4% this month</small><i className={styles.green}><CircleDollarSign/></i></article>
                <article className={styles.metric}><span>Emergency runway</span><strong>6.8 months</strong><small className={styles.positive}>On track</small><i className={styles.amber}><PiggyBank/></i></article>
              </div>

              <div className={styles.dashboardGrid}>
                <div className={styles.mainColumn}>
                  <div className={styles.chartGrid}>
                    <article className={styles.card}>
                      <div className={styles.cardTitle}><div><span>Cash flow</span><small>Income, spending and net savings</small></div><button>Last 6 months <ChevronDown/></button></div>
                      <div className={styles.legend}><i className={styles.legendIncome}/>Income <i className={styles.legendSpend}/>Expenses</div>
                      <svg className={styles.lineChart} viewBox="0 0 540 190" role="img" aria-label="Six month cash flow chart">
                        <g className={styles.gridLines}><path d="M20 25H520M20 65H520M20 105H520M20 145H520"/></g>
                        <path className={styles.incomeLine} d="M20 112 C70 105,80 92,120 98 S185 54,225 73 S285 62,325 65 S390 25,425 44 S485 38,520 46"/>
                        <path className={styles.spendLine} d="M20 144 C70 138,83 145,120 134 S184 124,225 136 S290 115,325 124 S389 108,425 119 S485 105,520 111"/>
                      </svg>
                    </article>
                    <article className={styles.card}>
                      <div className={styles.cardTitle}><div><span>Spending by category</span><small>This month</small></div></div>
                      <div className={styles.donutRow}><div className={styles.donut}><span><strong>₹32.5K</strong><small>Total</small></span></div><ul><li><i className={styles.c1}/>Food <b>32%</b></li><li><i className={styles.c2}/>Housing <b>28%</b></li><li><i className={styles.c3}/>Transport <b>18%</b></li><li><i className={styles.c4}/>Other <b>22%</b></li></ul></div>
                    </article>
                  </div>
                  <article className={`${styles.card} ${styles.transactions}`}>
                    <div className={styles.cardTitle}><div><span>Recent transactions</span><small>Latest account activity</small></div><button>View all <ArrowRight/></button></div>
                    {transactions.map(([merchant, category, amount], index) => <div className={styles.transaction} key={merchant}><i>{merchant.slice(0, 1)}</i><span><strong>{merchant}</strong><small>{category}</small></span><time>{index === 0 ? 'Today' : `${index + 1} days ago`}</time><b className={amount.startsWith('+') ? styles.positive : ''}>{amount}</b></div>)}
                  </article>
                </div>
                <aside className={styles.insights}>
                  <div className={styles.insightsTitle}><BrainCircuit/>FinPulse AI Insights</div>
                  <article className={styles.insightGood}><TrendingDown/><span><strong>Spending is improving</strong><p>You spent 8.7% less this month. Your savings rate is moving up.</p></span></article>
                  <article className={styles.insightWarn}><ReceiptText/><span><strong>Dining needs attention</strong><p>Dining is ₹1,420 above your three-month average.</p></span></article>
                  <article className={styles.insightInfo}><PiggyBank/><span><strong>Build your safety net</strong><p>Add ₹3,500 monthly to reach an 8-month runway faster.</p></span></article>
                </aside>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.features} id="features">
        <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>What FinPulse handles</p><h2>Useful intelligence, without the financial fog.</h2></div></div>
        <div className={styles.featureGrid}>
          <article><span><ReceiptText/></span><h3>Expense capture</h3><p>Add transactions manually, import CSV statements, or speak an expense and confirm it before saving.</p></article>
          <article><span><BrainCircuit/></span><h3>AI guidance</h3><p>Understand spending, monthly savings, unusual activity, and practical actions based on your own data.</p></article>
          <article id="security"><span><ShieldCheck/></span><h3>Controlled access</h3><p>Email and password authentication, user-owned records, and row-level database security.</p></article>
        </div>
      </section>

      <section className={styles.bottomCta}>
        <div><p className={styles.eyebrow}>Ready when you are</p><h2>Turn your transactions into decisions.</h2></div>
        <Link className={styles.getStarted} href="/login">Create your account <ArrowRight size={17}/></Link>
      </section>
      <footer className={styles.footer}><span><Activity size={18}/>FinPulse</span><small>Personal finance intelligence. Demo banking connections do not transfer money.</small></footer>
    </main>
  );
}
