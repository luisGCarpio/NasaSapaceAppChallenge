'use client';

import { useState, type FormEvent } from 'react';
import { useAres } from '@/context/AresContext';
import { AresIcon } from '../ui/Icons';

export function AuthView() {
  const { login, register } = useAres();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Astronauta — Tripulación A.R.E.S.');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (mode === 'login') {
        await login(identifier, password);
      } else {
        await register({ name, username, email: email || undefined, role, password });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar la autenticación.');
    } finally {
      setSubmitting(false);
    }
  }

  function fillDemoAccount(demoUsername: string) {
    setMode('login');
    setIdentifier(demoUsername);
    setPassword('123');
    setError(null);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#060A12] px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-[#1E2E4E] bg-[#0B1220] p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0B3D91] text-white">
            <AresIcon name="activity" size={22} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-100">A.R.E.S. Pulse</h1>
            <p className="text-xs text-slate-400">
              Sistema 100% software de autoevaluación para tripulación
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl border border-[#1E2E4E] bg-[#060A12] p-1">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`rounded-lg py-2 text-xs font-semibold transition-colors ${
              mode === 'login' ? 'bg-[#0B3D91] text-white' : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`rounded-lg py-2 text-xs font-semibold transition-colors ${
              mode === 'register' ? 'bg-[#0B3D91] text-white' : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            Crear perfil
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
          {mode === 'register' ? (
            <>
              <div>
                <label htmlFor="auth-name" className="block text-xs font-medium text-slate-300">
                  Nombre completo
                </label>
                <input
                  id="auth-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Esp. Lucía Morales"
                  className="mt-1 w-full rounded-xl border border-[#1E2E4E] bg-[#060A12] px-3.5 py-2.5 text-sm text-slate-100"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="auth-username" className="block text-xs font-medium text-slate-300">
                    Usuario
                  </label>
                  <input
                    id="auth-username"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="lucia.m"
                    className="mt-1 w-full rounded-xl border border-[#1E2E4E] bg-[#060A12] px-3.5 py-2.5 text-sm text-slate-100"
                  />
                </div>
                <div>
                  <label htmlFor="auth-email" className="block text-xs font-medium text-slate-300">
                    Correo (opcional)
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="lucia@nasa.gov"
                    className="mt-1 w-full rounded-xl border border-[#1E2E4E] bg-[#060A12] px-3.5 py-2.5 text-sm text-slate-100"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="auth-role" className="block text-xs font-medium text-slate-300">
                  Rol de misión
                </label>
                <input
                  id="auth-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#1E2E4E] bg-[#060A12] px-3.5 py-2.5 text-sm text-slate-100"
                />
              </div>
            </>
          ) : (
            <div>
              <label htmlFor="auth-identifier" className="block text-xs font-medium text-slate-300">
                Usuario o correo electrónico
              </label>
              <input
                id="auth-identifier"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="elena o elena@nasa.gov"
                className="mt-1 w-full rounded-xl border border-[#1E2E4E] bg-[#060A12] px-3.5 py-2.5 text-sm text-slate-100"
              />
            </div>
          )}

          <div>
            <label htmlFor="auth-password" className="block text-xs font-medium text-slate-300">
              Contraseña {mode === 'register' ? '(mínimo 6 caracteres)' : ''}
            </label>
            <input
              id="auth-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              className="mt-1 w-full rounded-xl border border-[#1E2E4E] bg-[#060A12] px-3.5 py-2.5 text-sm text-slate-100"
            />
          </div>

          {error ? (
            <p role="alert" className="rounded-xl border border-red-500/40 bg-red-950/50 px-3 py-2 text-xs text-red-200">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-[#0B3D91] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#105BD8] disabled:opacity-50 transition-colors"
          >
            {submitting
              ? 'Verificando credenciales...'
              : mode === 'login'
                ? 'Entrar al panel'
                : 'Registrar tripulante'}
          </button>
        </form>

        <div className="mt-5 border-t border-[#1E2E4E] pt-4">
          <p className="text-xs font-medium text-slate-400">
            Cuentas de acceso rápido (bitácora limpia — sin signos vitales ficticios precargados):
          </p>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillDemoAccount('elena')}
              className="rounded-xl border border-[#1E2E4E] bg-[#060A12] px-3 py-2 text-left hover:border-[#38BDF8]"
            >
              <p className="text-xs font-semibold text-slate-100">Cmdr. Elena Vance</p>
              <p className="text-[11px] text-slate-400">elena · clave: 123</p>
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('marco')}
              className="rounded-xl border border-[#1E2E4E] bg-[#060A12] px-3 py-2 text-left hover:border-[#38BDF8]"
            >
              <p className="text-xs font-semibold text-slate-100">Esp. Marco Silva</p>
              <p className="text-[11px] text-slate-400">marco · clave: 123</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
