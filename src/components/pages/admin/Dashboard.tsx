import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { ShieldCheck, ToggleLeft, ToggleRight, UserPlus, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useAdminControls } from "../../../admin/useAdminControls";
import Character from "../../../models/character";
import accountService from "../../../services/account.service";
import characterService from "../../../services/character.service";
import type { AccountDto, UserRole } from "../../../types/api";
import "./dashboard.scss";

type Status = {
  tone: "success" | "error";
  message: string;
};

const ROLE_OPTIONS: UserRole[] = ["player", "admin"];

export default function Dashboard() {
  const { t } = useTranslation();
  const { manageCharactersEnabled, setManageCharactersEnabled } = useAdminControls();
  const [accounts, setAccounts] = useState<AccountDto[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<Status | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("player");
  const [submittingAccount, setSubmittingAccount] = useState(false);
  const [updatingAccountId, setUpdatingAccountId] = useState<number | null>(null);
  const [updatingCharacterId, setUpdatingCharacterId] = useState<number | null>(null);

  const accountById = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts],
  );

  const formatError = useCallback((error: unknown, fallback: string) => {
    if (axios.isAxiosError(error)) {
      const data = error.response?.data as { detail?: unknown } | undefined;
      const message = typeof data?.detail === "string" ? data.detail : error.message;
      return t("common.errors.status", {
        status: error.response?.status ?? "network",
        message,
      });
    }
    return fallback;
  }, [t]);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setStatus(null);
    try {
      const [accountRows, characterRows] = await Promise.all([
        accountService.list(),
        characterService.list(),
      ]);
      setAccounts(accountRows);
      setCharacters(characterRows);
    } catch (error) {
      setStatus({
        tone: "error",
        message: formatError(error, t("dashboard.errors.loadFailed")),
      });
    } finally {
      setLoading(false);
    }
  }, [formatError, t]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  async function createAccount(event: FormEvent) {
    event.preventDefault();
    setSubmittingAccount(true);
    setStatus(null);
    try {
      await accountService.create({ username, password, role });
      setUsername("");
      setPassword("");
      setRole("player");
      setStatus({ tone: "success", message: t("dashboard.accounts.created") });
      await fetchDashboard();
    } catch (error) {
      setStatus({
        tone: "error",
        message: formatError(error, t("dashboard.accounts.createFailed")),
      });
    } finally {
      setSubmittingAccount(false);
    }
  }

  async function updateAccountRole(account: AccountDto, nextRole: UserRole) {
    if (account.role === nextRole) return;
    setUpdatingAccountId(account.id);
    setStatus(null);
    try {
      await accountService.update(account.id, { role: nextRole });
      setStatus({ tone: "success", message: t("dashboard.accounts.updated") });
      await fetchDashboard();
    } catch (error) {
      setStatus({
        tone: "error",
        message: formatError(error, t("dashboard.accounts.updateFailed")),
      });
    } finally {
      setUpdatingAccountId(null);
    }
  }

  async function updateCharacterOwner(character: Character, rawOwnerId: string) {
    const ownerUserId = rawOwnerId ? Number(rawOwnerId) : null;
    const previousOwnerId = character.ownerUserId ?? null;
    setUpdatingCharacterId(character.id);
    setStatus(null);
    try {
      const response = await characterService.patch(character.slug, { ownerUserId });
      const updatedCharacter = new Character(response.data);
      setCharacters((currentCharacters) => currentCharacters.map((item) => (
        item.id === updatedCharacter.id ? updatedCharacter : item
      )));
      if (previousOwnerId !== ownerUserId) {
        setAccounts((currentAccounts) => currentAccounts.map((account) => {
          if (account.id === previousOwnerId) {
            return { ...account, owned_character_count: Math.max(0, account.owned_character_count - 1) };
          }
          if (account.id === ownerUserId) {
            return { ...account, owned_character_count: account.owned_character_count + 1 };
          }
          return account;
        }));
      }
      setStatus({ tone: "success", message: t("dashboard.characters.ownerUpdated") });
    } catch (error) {
      setStatus({
        tone: "error",
        message: formatError(error, t("dashboard.characters.ownerUpdateFailed")),
      });
    } finally {
      setUpdatingCharacterId(null);
    }
  }

  return (
    <div className="page">
      <main className="admin-dashboard">
        <header className="admin-dashboard__header">
          <div>
            <h1>{t("dashboard.title")}</h1>
            <p>{t("dashboard.subtitle")}</p>
          </div>
          <button
            type="button"
            className={`admin-dashboard__toggle ${manageCharactersEnabled ? "is-active" : ""}`}
            aria-pressed={manageCharactersEnabled}
            onClick={() => setManageCharactersEnabled(!manageCharactersEnabled)}
          >
            {manageCharactersEnabled ? <ToggleRight size={20} aria-hidden="true" /> : <ToggleLeft size={20} aria-hidden="true" />}
            <span>{t("dashboard.manageCharacters")}</span>
          </button>
        </header>

        {status && (
          <p className={`admin-dashboard__status admin-dashboard__status--${status.tone}`} role="status">
            {status.message}
          </p>
        )}

        {loading ? (
          <div className="character-message loading">
            <div className="spinner" aria-hidden="true" />
            <p>{t("common.loading")}</p>
          </div>
        ) : (
          <div className="admin-dashboard__grid">
            <section className="admin-panel" aria-labelledby="dashboard-accounts-title">
              <header className="admin-panel__header">
                <Users size={18} aria-hidden="true" />
                <h2 id="dashboard-accounts-title">{t("dashboard.accounts.title")}</h2>
              </header>

              <div className="admin-tableWrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t("auth.fields.username")}</th>
                      <th>{t("dashboard.accounts.role")}</th>
                      <th>{t("dashboard.accounts.characters")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((account) => (
                      <tr key={account.id}>
                        <td>{account.username}</td>
                        <td>
                          <select
                            value={account.role}
                            disabled={updatingAccountId === account.id}
                            onChange={(event) => updateAccountRole(account, event.target.value as UserRole)}
                            aria-label={t("dashboard.accounts.roleFor", { username: account.username })}
                          >
                            {ROLE_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {t(`roles.${option}`)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>{account.owned_character_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="admin-panel" aria-labelledby="dashboard-create-account-title">
              <header className="admin-panel__header">
                <UserPlus size={18} aria-hidden="true" />
                <h2 id="dashboard-create-account-title">{t("dashboard.accounts.createTitle")}</h2>
              </header>

              <form className="admin-form" onSubmit={createAccount}>
                <label>
                  {t("auth.fields.username")}
                  <input value={username} onChange={(event) => setUsername(event.target.value)} required />
                </label>
                <label>
                  {t("auth.fields.password")}
                  <input
                    type="password"
                    minLength={12}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </label>
                <label>
                  {t("dashboard.accounts.role")}
                  <select value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
                    {ROLE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {t(`roles.${option}`)}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="submit" disabled={submittingAccount}>
                  {submittingAccount ? t("dashboard.accounts.creating") : t("dashboard.accounts.create")}
                </button>
              </form>
            </section>

            <section className="admin-panel admin-panel--wide" aria-labelledby="dashboard-characters-title">
              <header className="admin-panel__header">
                <ShieldCheck size={18} aria-hidden="true" />
                <h2 id="dashboard-characters-title">{t("dashboard.characters.title")}</h2>
              </header>

              <div className="admin-tableWrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t("createCharacter.name")}</th>
                      <th>{t("createCharacter.race")}</th>
                      <th>{t("dashboard.characters.owner")}</th>
                      <th>{t("common.actions.open")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {characters.map((character) => {
                      const owner = character.ownerUserId ? accountById.get(character.ownerUserId) : null;
                      return (
                        <tr key={character.id}>
                          <td>
                            <strong>{character.name}</strong>
                            <span className="admin-table__meta">{character.slug}</span>
                          </td>
                          <td>{character.race}</td>
                          <td>
                            <select
                              value={character.ownerUserId ?? ""}
                              disabled={updatingCharacterId === character.id}
                              onChange={(event) => updateCharacterOwner(character, event.target.value)}
                              aria-label={t("dashboard.characters.ownerFor", { name: character.name })}
                            >
                              <option value="">{t("dashboard.characters.unassigned")}</option>
                              {accounts.map((account) => (
                                <option key={account.id} value={account.id}>
                                  {account.username}
                                </option>
                              ))}
                            </select>
                            {owner && <span className="admin-table__meta">{t(`roles.${owner.role}`)}</span>}
                          </td>
                          <td>
                            <Link to={`/characters/${character.slug}`}>{t("common.actions.open")}</Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
