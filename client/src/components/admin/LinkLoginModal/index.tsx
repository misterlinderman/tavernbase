import { FormEvent, useEffect, useState } from 'react';
import { useAdminApi } from '../../../hooks/useAdminApi';
import { useToast } from '../shared/Toast';
import {
  invitePlayerLogin,
  linkPlayerLoginManual,
  unlinkPlayerLogin,
} from '../../../services/leagues';
import type { PlayerLoginInviteResult } from '../../../types/leagues';
import formStyles from '../shared/adminForm.module.css';
import styles from './LinkLoginModal.module.css';

export interface LinkLoginModalPlayer {
  _id: string;
  name: string;
  email?: string;
  auth0Sub?: string;
  captainInvitedAt?: string;
}

export interface LinkLoginModalProps {
  open: boolean;
  player: LinkLoginModalPlayer | null;
  defaultRole: 'captain' | 'player';
  canManualLink: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function LinkLoginModal({
  open,
  player,
  defaultRole,
  canManualLink,
  onClose,
  onSuccess,
}: LinkLoginModalProps) {
  const { adminFetch } = useAdminApi();
  const { toast } = useToast();
  const [mode, setMode] = useState<'invite' | 'manual'>('invite');
  const [role, setRole] = useState<'captain' | 'player'>(defaultRole);
  const [email, setEmail] = useState('');
  const [auth0Sub, setAuth0Sub] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [inviteResult, setInviteResult] = useState<PlayerLoginInviteResult | null>(null);

  useEffect(() => {
    if (!open || !player) {
      return;
    }

    setMode('invite');
    setRole(defaultRole);
    setEmail(player.email ?? '');
    setDisplayName(player.name);
    setAuth0Sub('');
    setInviteResult(null);
  }, [defaultRole, open, player]);

  if (!open || !player) {
    return null;
  }

  const isLinked = Boolean(player.auth0Sub);

  const handleInviteSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!email.trim()) {
      toast('Email is required', 'error');
      return;
    }

    setSubmitting(true);

    try {
      const result = await invitePlayerLogin(adminFetch, player._id, {
        mode: 'invite',
        email: email.trim(),
        role,
      });
      setInviteResult(result);

      if (result.alreadyLinked) {
        toast(`${result.playerName} is already linked`, 'success');
      } else if (result.delivery === 'auth0_email' && result.auth0EmailSent) {
        toast(`Invite email sent to ${result.playerEmail} via Auth0`, 'success');
      } else {
        try {
          await navigator.clipboard.writeText(result.emailBody);
          toast(`Invite ready — email copied for ${result.playerEmail}`, 'success');
        } catch {
          toast(`Invite ready for ${result.playerEmail}`, 'success');
        }
      }

      onSuccess();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not send invite', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!auth0Sub.trim() || !email.trim() || !displayName.trim()) {
      toast('Auth0 sub, email, and name are required', 'error');
      return;
    }

    setSubmitting(true);

    try {
      await linkPlayerLoginManual(adminFetch, player._id, {
        mode: 'manual',
        auth0Sub: auth0Sub.trim(),
        email: email.trim(),
        name: displayName.trim(),
        role,
      });
      toast(
        role === 'captain'
          ? 'Captain login linked — they can sign in at /captain/login'
          : 'Player login linked — they can sign in at /player/login',
        'success'
      );
      onSuccess();
      onClose();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not link login', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnlink = async () => {
    if (!window.confirm(`Remove login access for ${player.name}?`)) {
      return;
    }

    setSubmitting(true);

    try {
      await unlinkPlayerLogin(adminFetch, player._id);
      toast('Login unlinked', 'success');
      onSuccess();
      onClose();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not unlink login', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-labelledby="link-login-title"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <h2 id="link-login-title" className={styles.title}>
            {isLinked ? 'Login linked' : 'Link login'} — {player.name}
          </h2>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        {isLinked ? (
          <div className={styles.linkedPanel}>
            <p className={styles.linkedText}>
              This player has an Auth0 login linked
              {player.auth0Sub ? ` (${player.auth0Sub})` : ''}.
            </p>
            <div className={styles.actions}>
              <button
                type="button"
                className="btn btn-outline"
                disabled={submitting}
                onClick={handleUnlink}
              >
                {submitting ? 'Removing…' : 'Unlink login'}
              </button>
              <button type="button" className="btn btn-green" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className={styles.modeTabs}>
              <button
                type="button"
                className={mode === 'invite' ? styles.modeTabActive : styles.modeTab}
                onClick={() => setMode('invite')}
              >
                Invite by email
              </button>
              {canManualLink ? (
                <button
                  type="button"
                  className={mode === 'manual' ? styles.modeTabActive : styles.modeTab}
                  onClick={() => setMode('manual')}
                >
                  Advanced — Auth0 sub
                </button>
              ) : null}
            </div>

            <div className={styles.field}>
              <label className={formStyles.fieldLabel} htmlFor="link-login-role">
                Portal role
              </label>
              <select
                id="link-login-role"
                className={formStyles.select}
                value={role}
                onChange={(event) => setRole(event.target.value as 'captain' | 'player')}
              >
                <option value="captain">Captain — submit scoresheets</option>
                <option value="player">Player — view standings / scores</option>
              </select>
            </div>

            {mode === 'invite' ? (
              <form onSubmit={handleInviteSubmit}>
                <div className={styles.field}>
                  <label className={formStyles.fieldLabel} htmlFor="link-login-email">
                    Email
                  </label>
                  <input
                    id="link-login-email"
                    className={formStyles.input}
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@example.com"
                    required
                  />
                </div>
                <p className={styles.help}>
                  They will sign in at{' '}
                  {role === 'captain' ? (
                    <a href="/captain/login">/captain/login</a>
                  ) : (
                    <a href="/player/login">/player/login</a>
                  )}{' '}
                  with this email — no Auth0 sub paste required.
                </p>
                <div className={styles.actions}>
                  <button type="button" className="btn btn-outline" onClick={onClose}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-green" disabled={submitting}>
                    {submitting ? 'Sending…' : 'Send invite'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleManualSubmit}>
                <div className={styles.field}>
                  <label className={formStyles.fieldLabel} htmlFor="link-login-sub">
                    Auth0 sub
                  </label>
                  <input
                    id="link-login-sub"
                    className={formStyles.input}
                    value={auth0Sub}
                    onChange={(event) => setAuth0Sub(event.target.value)}
                    placeholder="auth0|abc123"
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label className={formStyles.fieldLabel} htmlFor="link-login-manual-email">
                    Email
                  </label>
                  <input
                    id="link-login-manual-email"
                    className={formStyles.input}
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label className={formStyles.fieldLabel} htmlFor="link-login-name">
                    Display name
                  </label>
                  <input
                    id="link-login-name"
                    className={formStyles.input}
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    required
                  />
                </div>
                <div className={styles.actions}>
                  <button type="button" className="btn btn-outline" onClick={onClose}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-green" disabled={submitting}>
                    {submitting ? 'Linking…' : 'Link login'}
                  </button>
                </div>
              </form>
            )}

            {inviteResult && !inviteResult.alreadyLinked ? (
              <details className={styles.inviteDetails}>
                <summary>
                  {inviteResult.delivery === 'auth0_email' && inviteResult.auth0EmailSent
                    ? `Auth0 email sent to ${inviteResult.playerName}`
                    : `Invite email for ${inviteResult.playerName}`}
                </summary>
                {inviteResult.delivery === 'auth0_email' && inviteResult.auth0EmailSent ? (
                  <p className={styles.help}>
                    Auth0 sent a password setup email. You can still copy the template below if
                    needed.
                  </p>
                ) : null}
                <p className={styles.inviteMeta}>Subject: {inviteResult.emailSubject}</p>
                <pre className={styles.inviteBody}>{inviteResult.emailBody}</pre>
              </details>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

export default LinkLoginModal;
