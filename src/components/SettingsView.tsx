import React, { useState, useEffect } from 'react';
import {
  Key,
  CheckCircle2,
  Link,
  Unlink,
  Check,
  ShieldCheck,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronRight,
  Briefcase,
  Layers,
  Filter,
  ArrowRight,
  ArrowLeft,
  Plus,
  SlidersHorizontal,
  User,
  Users,
  UserCheck,
  Save,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { KeychainService } from '../services/keychain';
import { SettingsRepository } from '../services/settingsRepository';
import { ProviderFactory } from '../providers/ProviderFactory';
import { TaskSource, Workspace } from '../providers/TaskProvider';
import { SyncService } from '../services/syncService';
import { IntegrationConfig, TaskAssignee } from '../types';

export const SettingsView: React.FC = () => {
  const {
    integration,
    setIntegration,
    isSyncing,
    availableSources,
    setAvailableSources,
  } = useAppStore();

  const [token, setToken] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Setup Wizard State (1 = Workspaces, 2 = Lists, 3 = Assignee, 4 = Statuses, 0 = Configured Summary)
  const [wizardStep, setWizardStep] = useState<number>(0);
  
  // Data for wizard
  const [availableWorkspaces, setAvailableWorkspaces] = useState<Workspace[]>([]);
  const [availableMembers, setAvailableMembers] = useState<TaskAssignee[]>([]);
  const [currentUser, setCurrentUser] = useState<TaskAssignee | null>(null);

  const [selectedWorkspaceIds, setSelectedWorkspaceIds] = useState<string[]>(
    integration?.selectedWorkspaceIds || []
  );
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>(
    integration?.selectedSourceIds || []
  );
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>(
    integration?.selectedAssigneeIds || []
  );
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(
    integration?.selectedStatuses || []
  );
  const [hideDoneTasks, setHideDoneTasks] = useState<boolean>(
    integration?.hideDoneTasks ?? false
  );

  const [memberSearch, setMemberSearch] = useState('');

  // App Preferences State
  const [autostart, setAutostart] = useState(true);
  const [globalShortcut, setGlobalShortcut] = useState(true);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [prefsSavedMessage, setPrefsSavedMessage] = useState<string | null>(null);

  const [isLoadingStep, setIsLoadingStep] = useState(false);
  const [listSearch, setListSearch] = useState('');
  const [expandedSpaces, setExpandedSpaces] = useState<Record<string, boolean>>({});

  const isConnected = !!integration && integration.isActive;

  useEffect(() => {
    async function loadData() {
      const savedToken = await KeychainService.getToken('clickup_api_token');
      if (savedToken) {
        setToken(savedToken);
      }
      if (integration) {
        setSelectedWorkspaceIds(integration.selectedWorkspaceIds || []);
        setSelectedSourceIds(integration.selectedSourceIds || []);
        setSelectedAssigneeIds(integration.selectedAssigneeIds || []);
        setSelectedStatuses(integration.selectedStatuses || []);
        setHideDoneTasks(integration.hideDoneTasks ?? false);
        setWizardStep(0); // Show summary
      }

      // Load app preferences
      const prefs = await SettingsRepository.getAppPreferences();
      setAutostart(prefs.autostart);
      setGlobalShortcut(prefs.globalShortcut);
    }
    loadData();
  }, [integration?.id]);

  // --- Step 1: Validate & Load Workspaces ---
  const handleStartWizard = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!token.trim()) return;

    setIsValidating(true);
    setErrorMessage(null);

    const cleanToken = token.trim();
    const provider = ProviderFactory.getProvider('clickup');
    const result = await provider.validateToken(cleanToken);

    if (!result.isValid) {
      setIsValidating(false);
      setErrorMessage(result.error || 'Token inválido ou sem autorização.');
      return;
    }

    await KeychainService.saveToken('clickup_api_token', cleanToken);

    // Fetch workspaces
    const workspaces = await provider.getWorkspaces(cleanToken);
    setAvailableWorkspaces(workspaces);

    if (workspaces.length > 0 && selectedWorkspaceIds.length === 0) {
      // Pre-select all available workspaces by default
      setSelectedWorkspaceIds(workspaces.map((w) => w.id));
    }

    setIsValidating(false);
    setWizardStep(1); // Move to Step 1: Workspaces
  };

  const handleOpenWorkspacesStep = async () => {
    setIsLoadingStep(true);
    setErrorMessage(null);
    try {
      const cleanToken = token.trim() || (await KeychainService.getToken('clickup_api_token')) || '';
      const provider = ProviderFactory.getProvider('clickup');
      const workspaces = await provider.getWorkspaces(cleanToken);
      setAvailableWorkspaces(workspaces);
      setWizardStep(1);
    } catch (e: any) {
      setErrorMessage('Erro ao carregar workspaces: ' + e.message);
    } finally {
      setIsLoadingStep(false);
    }
  };

  // --- Step 2: Load Lists for selected Workspace(s) ---
  const handleProceedToLists = async () => {
    if (selectedWorkspaceIds.length === 0) {
      setErrorMessage('Por favor, selecione pelo menos um Workspace.');
      return;
    }
    setErrorMessage(null);
    setIsLoadingStep(true);

    try {
      const cleanToken = token.trim() || (await KeychainService.getToken('clickup_api_token')) || '';
      const provider = ProviderFactory.getProvider('clickup');
      const sources = await provider.getSources(cleanToken, selectedWorkspaceIds);
      
      setAvailableSources(sources);

      // Auto-expand all space groups by default
      const spaceMap: Record<string, boolean> = {};
      sources.forEach((s) => {
        const key = selectedWorkspaceIds.length > 1 && s.workspaceName
          ? `${s.workspaceName} › ${s.spaceName || 'Geral'}`
          : (s.spaceName || 'Geral');
        spaceMap[key] = true;
      });
      setExpandedSpaces(spaceMap);

      if (selectedSourceIds.length === 0) {
        // Select all lists by default initially
        setSelectedSourceIds(sources.map((s) => s.id));
      }

      setWizardStep(2); // Move to Step 2: Lists
    } catch (e: any) {
      setErrorMessage('Erro ao carregar listas do Workspace: ' + e.message);
    } finally {
      setIsLoadingStep(false);
    }
  };

  // --- Step 3: Load Members & Assignee Selection (User X) ---
  const handleProceedToAssignees = async () => {
    if (selectedSourceIds.length === 0) {
      setErrorMessage('Por favor, selecione pelo menos uma lista.');
      return;
    }
    setErrorMessage(null);
    setIsLoadingStep(true);

    try {
      const cleanToken = token.trim() || (await KeychainService.getToken('clickup_api_token')) || '';
      const provider = ProviderFactory.getProvider('clickup');
      
      const [members, user] = await Promise.all([
        provider.getWorkspaceMembers(cleanToken, selectedWorkspaceIds),
        provider.getCurrentUser(cleanToken),
      ]);

      setAvailableMembers(members);
      setCurrentUser(user);

      // If no assignee selected yet and user exists, pre-select current user by default
      if (selectedAssigneeIds.length === 0 && user) {
        setSelectedAssigneeIds([user.id]);
      }

      setWizardStep(3); // Move to Step 3: Assignee
    } catch (e: any) {
      setErrorMessage('Erro ao carregar usuários do workspace: ' + e.message);
    } finally {
      setIsLoadingStep(false);
    }
  };

  const handleOpenAssigneesStep = async () => {
    setIsLoadingStep(true);
    setErrorMessage(null);
    try {
      const cleanToken = token.trim() || (await KeychainService.getToken('clickup_api_token')) || '';
      const provider = ProviderFactory.getProvider('clickup');
      const [members, user] = await Promise.all([
        provider.getWorkspaceMembers(cleanToken, selectedWorkspaceIds),
        provider.getCurrentUser(cleanToken),
      ]);
      setAvailableMembers(members);
      setCurrentUser(user);
      setWizardStep(3);
    } catch (e: any) {
      setErrorMessage('Erro ao carregar membros: ' + e.message);
    } finally {
      setIsLoadingStep(false);
    }
  };

  // --- Step 4: Extract Statuses and Proceed to Status Selection ---
  const handleProceedToStatuses = () => {
    setErrorMessage(null);

    // Extract statuses from selected sources
    const selectedSources = availableSources.filter((s) => selectedSourceIds.includes(s.id));
    const allStatuses = Array.from(
      new Set(
        selectedSources.flatMap((s) => (s.statuses || []).map((st) => st.name.toUpperCase()))
      )
    );

    if (selectedStatuses.length === 0) {
      // By default select non-done statuses
      const activeStatuses = allStatuses.filter((st) => !['DONE', 'CLOSED', 'COMPLETE'].includes(st));
      setSelectedStatuses(activeStatuses.length > 0 ? activeStatuses : allStatuses);
    }

    setWizardStep(4); // Move to Step 4: Statuses
  };

  // --- Finalize Setup & Save ---
  const handleFinishSetup = async () => {
    if (selectedStatuses.length === 0) {
      setErrorMessage('Por favor, selecione pelo menos um status.');
      return;
    }
    setErrorMessage(null);
    setIsLoadingStep(true);

    let selectedWorkspaceNames = availableWorkspaces
      .filter((w) => selectedWorkspaceIds.includes(w.id))
      .map((w) => w.name);

    if (selectedWorkspaceNames.length === 0) {
      const namesFromSources = Array.from(
        new Set(
          availableSources
            .filter((s) => s.workspaceName && selectedWorkspaceIds.includes(s.workspaceId || ''))
            .map((s) => s.workspaceName!)
        )
      );
      selectedWorkspaceNames =
        namesFromSources.length > 0
          ? namesFromSources
          : (integration?.selectedWorkspaceNames || []);
    }

    // Resolve assignee names
    let selectedAssigneeNames: string[] = [];
    if (selectedAssigneeIds.length > 0) {
      selectedAssigneeNames = availableMembers
        .filter((m) => selectedAssigneeIds.includes(m.id))
        .map((m) => m.username);

      if (selectedAssigneeNames.length === 0 && currentUser && selectedAssigneeIds.includes(currentUser.id)) {
        selectedAssigneeNames = [currentUser.username];
      }
      if (selectedAssigneeNames.length === 0 && integration?.selectedAssigneeNames) {
        selectedAssigneeNames = integration.selectedAssigneeNames;
      }
    }

    const config: IntegrationConfig = {
      id: 'int_clickup_1',
      provider: 'clickup',
      isActive: true,
      selectedWorkspaceIds,
      selectedWorkspaceNames,
      selectedSourceIds,
      selectedAssigneeIds,
      selectedAssigneeNames,
      selectedStatuses,
      hideDoneTasks,
      lastSyncAt: new Date().toISOString(),
    };

    await SettingsRepository.saveIntegration(config);
    setIntegration(config);

    // Trigger sync
    await SyncService.syncNow();

    setIsLoadingStep(false);
    setWizardStep(0); // Show summary
    setFeedbackMessage('Configuração concluída e tarefas sincronizadas com sucesso!');
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const handleDisconnect = async () => {
    await KeychainService.deleteToken('clickup_api_token');
    if (integration) {
      await SettingsRepository.deleteIntegration(integration.id);
    }
    setToken('');
    setIntegration(null);
    setAvailableSources([]);
    setSelectedWorkspaceIds([]);
    setSelectedSourceIds([]);
    setSelectedAssigneeIds([]);
    setSelectedStatuses([]);
    setWizardStep(0);
    setFeedbackMessage('Integração desconectada com sucesso.');
    setTimeout(() => setFeedbackMessage(null), 2500);
  };

  // Helpers for Assignees
  const toggleAssignee = (userId: string) => {
    setSelectedAssigneeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const selectOnlyUser = (userId: string) => {
    setSelectedAssigneeIds([userId]);
  };

  const selectAllAssignees = () => {
    setSelectedAssigneeIds([]);
  };

  // Helpers for Workspaces
  const toggleWorkspace = (wsId: string) => {
    setSelectedWorkspaceIds((prev) =>
      prev.includes(wsId) ? prev.filter((id) => id !== wsId) : [...prev, wsId]
    );
  };

  const toggleAllWorkspaces = (select: boolean) => {
    if (select) {
      setSelectedWorkspaceIds(availableWorkspaces.map((w) => w.id));
    } else {
      setSelectedWorkspaceIds([]);
    }
  };

  // Helpers for Lists
  const toggleSource = (sourceId: string) => {
    const next = selectedSourceIds.includes(sourceId)
      ? selectedSourceIds.filter((id) => id !== sourceId)
      : [...selectedSourceIds, sourceId];
    setSelectedSourceIds(next);
  };

  const toggleSpaceAll = (spaceGroupKey: string, select: boolean) => {
    const spaceSources = availableSources.filter((s) => {
      const key = selectedWorkspaceIds.length > 1 && s.workspaceName
        ? `${s.workspaceName} › ${s.spaceName || 'Geral'}`
        : (s.spaceName || 'Geral');
      return key === spaceGroupKey;
    });
    const spaceIds = spaceSources.map((s) => s.id);
    const next = select
      ? Array.from(new Set([...selectedSourceIds, ...spaceIds]))
      : selectedSourceIds.filter((id) => !spaceIds.includes(id));
    setSelectedSourceIds(next);
  };

  const toggleStatus = (statusName: string) => {
    const upper = statusName.toUpperCase();
    const next = selectedStatuses.includes(upper)
      ? selectedStatuses.filter((s) => s !== upper)
      : [...selectedStatuses, upper];
    setSelectedStatuses(next);
  };

  // Grouped lists for Step 2
  const filteredSources = availableSources.filter((s) => {
    const q = listSearch.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.workspaceName && s.workspaceName.toLowerCase().includes(q)) ||
      (s.spaceName && s.spaceName.toLowerCase().includes(q)) ||
      (s.folderName && s.folderName.toLowerCase().includes(q))
    );
  });

  const groupedBySpace = filteredSources.reduce<Record<string, TaskSource[]>>((acc, s) => {
    const spaceKey = selectedWorkspaceIds.length > 1 && s.workspaceName
      ? `${s.workspaceName} › ${s.spaceName || 'Geral'}`
      : (s.spaceName || 'Geral');
    if (!acc[spaceKey]) acc[spaceKey] = [];
    acc[spaceKey].push(s);
    return acc;
  }, {});

  // Distinct statuses for Step 3
  const selectedSourcesList = availableSources.filter((s) => selectedSourceIds.includes(s.id));
  const distinctStatuses = Array.from(
    new Set(
      selectedSourcesList.flatMap((s) => (s.statuses || []).map((st) => st.name.toUpperCase()))
    )
  );

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 select-none">
      {/* Header */}
      <div>
        <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
          <span>Configurações & Sincronização</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Filtros de Workspaces, Listas e Status para a aba Tarefas.
        </p>
      </div>

      {/* Main Integration Card */}
      <div className="p-3.5 bg-slate-950/60 border border-white/10 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
              CU
            </div>
            <div>
              <h3 className="text-xs font-semibold text-slate-200">ClickUp</h3>
              <p className="text-[10px] text-slate-400">Integração Oficial de Tarefas</p>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
              isConnected
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-slate-800 text-slate-400 border-white/5'
            }`}
          >
            {isConnected ? (
              <>
                <CheckCircle2 className="w-3 h-3" />
                <span>Conectado</span>
              </>
            ) : (
              <span>Desconectado</span>
            )}
          </span>
        </div>

        {/* ----------------- STEP 0: CONNECT TOKEN (IF DISCONNECTED) ----------------- */}
        {!isConnected && wizardStep === 0 && (
          <form onSubmit={handleStartWizard} className="space-y-2.5 pt-1">
            <div>
              <label className="text-[11px] font-medium text-slate-300 block mb-1">
                Personal API Token do ClickUp
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="pk_12345678_..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-white/10 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Salvo com segurança no Keychain
              </span>
              <button
                type="submit"
                disabled={isValidating || !token.trim()}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs py-1.5 px-3 rounded-xl transition-all shadow-sm flex items-center gap-1 active:scale-95 cursor-pointer"
              >
                <Link className="w-3 h-3" />
                <span>{isValidating ? 'Validando...' : 'Iniciar Configuração'}</span>
              </button>
            </div>
          </form>
        )}

        {/* ----------------- STEP 1: CHOOSE WORKSPACES ----------------- */}
        {wizardStep === 1 && (
          <div className="space-y-3 pt-1 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                <span>
                  Etapa 1 de 3: Selecione os Workspaces ({selectedWorkspaceIds.length}/{availableWorkspaces.length})
                </span>
              </span>
              {availableWorkspaces.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    toggleAllWorkspaces(selectedWorkspaceIds.length !== availableWorkspaces.length)
                  }
                  className="text-[10px] text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
                >
                  {selectedWorkspaceIds.length === availableWorkspaces.length
                    ? 'Desmarcar todos'
                    : 'Marcar todos'}
                </button>
              )}
            </div>

            <p className="text-[11px] text-slate-400">
              Você pode selecionar um ou múltiplos workspaces para sincronizar simultaneamente:
            </p>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {availableWorkspaces.map((ws) => {
                const isSelected = selectedWorkspaceIds.includes(ws.id);
                return (
                  <label
                    key={ws.id}
                    onClick={() => toggleWorkspace(ws.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-950/40 border-blue-500/40 text-white'
                        : 'bg-slate-900/60 border-white/5 hover:border-white/15 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded bg-slate-950 border-white/20 text-blue-600 cursor-pointer"
                      />
                      <span className="text-xs font-medium text-slate-200">{ws.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-500">ID: {ws.id}</span>
                  </label>
                );
              })}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/5">
              <button
                type="button"
                onClick={handleProceedToLists}
                disabled={isLoadingStep || selectedWorkspaceIds.length === 0}
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs py-1.5 px-3 rounded-xl transition-all shadow-sm flex items-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <span>{isLoadingStep ? 'Carregando listas...' : 'Avançar para Listas'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ----------------- STEP 2: CHOOSE LISTS ----------------- */}
        {wizardStep === 2 && (
          <div className="space-y-3 pt-1 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span>Etapa 2 de 3: Selecione as Listas</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                {selectedSourceIds.length} selecionada(s)
              </span>
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
              <input
                type="text"
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                placeholder="Buscar listas ou espaços..."
                className="w-full pl-7 pr-3 py-1 bg-slate-900 border border-white/10 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {Object.entries(groupedBySpace).map(([spaceName, sources]) => {
                const isExpanded = expandedSpaces[spaceName] !== false;
                const spaceIds = sources.map((s) => s.id);
                const allSelected = spaceIds.every((id) => selectedSourceIds.includes(id));

                return (
                  <div key={spaceName} className="rounded-xl bg-slate-900/70 border border-white/5 overflow-hidden">
                    <div className="flex items-center justify-between p-2 bg-slate-950/40">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedSpaces((prev) => ({ ...prev, [spaceName]: !isExpanded }))
                        }
                        className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 flex-1 text-left cursor-pointer"
                      >
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        <span>{spaceName}</span>
                        <span className="text-[10px] text-slate-500 font-normal">({sources.length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleSpaceAll(spaceName, !allSelected)}
                        className="text-[10px] text-blue-400 hover:text-blue-300 font-medium px-1.5 py-0.5 rounded cursor-pointer"
                      >
                        {allSelected ? 'Desmarcar tudo' : 'Marcar tudo'}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="p-1.5 space-y-1">
                        {sources.map((source) => {
                          const isChecked = selectedSourceIds.includes(source.id);
                          return (
                            <label
                              key={source.id}
                              onClick={() => toggleSource(source.id)}
                              className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer transition-colors ${
                                isChecked ? 'bg-blue-950/30 text-slate-200' : 'hover:bg-slate-800/60 text-slate-400'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {}}
                                  className="rounded bg-slate-950 border-white/20 text-blue-600 cursor-pointer"
                                />
                                <span className="text-xs truncate">{source.name}</span>
                              </div>
                              {source.folderName && (
                                <span className="text-[9px] text-slate-500 bg-slate-950/60 px-1 py-0.2 rounded">
                                  {source.folderName}
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-white/5">
              <button
                type="button"
                onClick={() => setWizardStep(1)}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar</span>
              </button>

              <button
                type="button"
                onClick={handleProceedToAssignees}
                disabled={selectedSourceIds.length === 0 || isLoadingStep}
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs py-1.5 px-3 rounded-xl transition-all shadow-sm flex items-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <span>{isLoadingStep ? 'Carregando usuários...' : 'Avançar para Responsável'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ----------------- STEP 3: CHOOSE ASSIGNEE (USER X) ----------------- */}
        {wizardStep === 3 && (
          <div className="space-y-3 pt-1 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-400" />
                <span>Etapa 3 de 4: Quem é o responsável pelas tarefas?</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                {selectedAssigneeIds.length === 0
                  ? 'Qualquer responsável'
                  : `${selectedAssigneeIds.length} selecionado(s)`}
              </span>
            </div>

            <p className="text-[11px] text-slate-400">
              Escolha de qual usuário você deseja sincronizar tarefas (apenas tarefas marcadas para ele serão importadas):
            </p>

            {/* Quick Presets */}
            <div className="grid grid-cols-2 gap-2">
              {currentUser && (
                <button
                  type="button"
                  onClick={() => selectOnlyUser(currentUser.id)}
                  className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                    selectedAssigneeIds.length === 1 && selectedAssigneeIds[0] === currentUser.id
                      ? 'bg-blue-950/50 border-blue-500/40 text-white shadow-sm'
                      : 'bg-slate-900/60 border-white/5 hover:border-white/15 text-slate-300'
                  }`}
                >
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                    <UserCheck className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate leading-tight">Apenas minhas tarefas</p>
                    <p className="text-[10px] text-slate-400 truncate">{currentUser.username}</p>
                  </div>
                </button>
              )}

              <button
                type="button"
                onClick={selectAllAssignees}
                className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                  selectedAssigneeIds.length === 0
                    ? 'bg-blue-950/50 border-blue-500/40 text-white shadow-sm'
                    : 'bg-slate-900/60 border-white/5 hover:border-white/15 text-slate-300'
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate leading-tight">Qualquer responsável</p>
                  <p className="text-[10px] text-slate-400 truncate">Sem filtro de usuário</p>
                </div>
              </button>
            </div>

            {/* Member Search & List */}
            {availableMembers.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Buscar membro por nome ou e-mail..."
                    className="w-full pl-7 pr-3 py-1 bg-slate-900 border border-white/10 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                  {availableMembers
                    .filter((m) => {
                      const q = memberSearch.toLowerCase();
                      return (
                        m.username.toLowerCase().includes(q) ||
                        (m.email && m.email.toLowerCase().includes(q))
                      );
                    })
                    .map((member) => {
                      const isSelected = selectedAssigneeIds.includes(member.id);
                      const isCurrentUser = currentUser?.id === member.id;

                      return (
                        <label
                          key={member.id}
                          onClick={() => toggleAssignee(member.id)}
                          className={`flex items-center justify-between p-2 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-blue-950/40 border-blue-500/40 text-white'
                              : 'bg-slate-900/60 border-white/5 hover:border-white/15 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded bg-slate-950 border-white/20 text-blue-600 cursor-pointer"
                            />
                            {member.avatarUrl ? (
                              <img
                                src={member.avatarUrl}
                                alt={member.username}
                                className="w-5 h-5 rounded-full object-cover"
                              />
                            ) : (
                              <div
                                className="w-5 h-5 rounded-full text-[10px] font-bold text-white flex items-center justify-center shrink-0"
                                style={{ backgroundColor: member.color || '#3b82f6' }}
                              >
                                {member.username.substring(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div className="truncate min-w-0">
                              <span className="text-xs font-medium block truncate">
                                {member.username}
                              </span>
                              {member.email && (
                                <span className="text-[10px] text-slate-500 block truncate">
                                  {member.email}
                                </span>
                              )}
                            </div>
                          </div>

                          {isCurrentUser && (
                            <span className="text-[9px] font-semibold bg-blue-500/20 text-blue-300 px-1.5 py-0.2 rounded border border-blue-500/30 shrink-0">
                              Você
                            </span>
                          )}
                        </label>
                      );
                    })}
                </div>
              </div>
            )}

            <div className="pt-2 flex items-center justify-between border-t border-white/5">
              <button
                type="button"
                onClick={() => setWizardStep(2)}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar para Listas</span>
              </button>

              <button
                type="button"
                onClick={handleProceedToStatuses}
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs py-1.5 px-3 rounded-xl transition-all shadow-sm flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <span>Avançar para Status</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ----------------- STEP 4: CHOOSE STATUSES ----------------- */}
        {wizardStep === 4 && (
          <div className="space-y-3 pt-1 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-blue-400" />
                <span>Etapa 4 de 4: Escolha os Status das tarefas</span>
              </span>
            </div>

            <p className="text-[11px] text-slate-400">
              Apenas tarefas com os status marcados abaixo serão importadas para a aba <strong>Tarefas</strong>:
            </p>

            {/* Status Pills Selector */}
            <div className="p-3 bg-slate-900/80 rounded-xl border border-white/5 space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {distinctStatuses.map((st) => {
                  const isChecked = selectedStatuses.includes(st);
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => toggleStatus(st)}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                          : 'bg-slate-950 text-slate-400 border-white/10 hover:text-slate-200'
                      }`}
                    >
                      {st}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-white/5 text-[10px]">
                <button
                  type="button"
                  onClick={() => setSelectedStatuses(distinctStatuses)}
                  className="text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
                >
                  Selecionar todos
                </button>
                <span className="text-slate-600">•</span>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedStatuses(
                      distinctStatuses.filter((s) => !['DONE', 'CLOSED', 'COMPLETE'].includes(s))
                    )
                  }
                  className="text-amber-400 hover:text-amber-300 font-medium cursor-pointer"
                >
                  Apenas tarefas em andamento / abertas
                </button>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-white/5">
              <button
                type="button"
                onClick={() => setWizardStep(3)}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar para Responsável</span>
              </button>

              <button
                type="button"
                onClick={handleFinishSetup}
                disabled={isLoadingStep || selectedStatuses.length === 0}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-1.5 px-4 rounded-xl transition-all shadow-md flex items-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isLoadingStep ? 'Sincronizando...' : 'Concluir e Sincronizar 🚀'}</span>
              </button>
            </div>
          </div>
        )}

        {/* ----------------- SUMMARY VIEW (WHEN CONFIGURED) ----------------- */}
        {isConnected && wizardStep === 0 && (
          <div className="space-y-3 pt-1">
            {/* Active Workspace Info */}
            <div className="p-3 bg-slate-900/90 rounded-xl border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                  <span>
                    Workspaces Sincronizados ({integration.selectedWorkspaceIds?.length || 1}):
                  </span>
                </span>
                <button
                  onClick={handleOpenWorkspacesStep}
                  className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 cursor-pointer transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Gerenciar workspaces</span>
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 pl-5">
                {integration.selectedWorkspaceNames && integration.selectedWorkspaceNames.length > 0 ? (
                  integration.selectedWorkspaceNames.map((name) => (
                    <span
                      key={name}
                      className="text-[10px] font-semibold bg-purple-950/60 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-md"
                    >
                      {name}
                    </span>
                  ))
                ) : (
                  <span className="text-xs font-medium text-slate-300">Workspace Principal</span>
                )}
              </div>
            </div>

            {/* Synchronized Lists Summary */}
            <div className="p-3 bg-slate-900/90 rounded-xl border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-400" />
                  <span>Listas Selecionadas:</span>
                </span>
                <button
                  onClick={handleProceedToLists}
                  className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  <span>Alterar listas</span>
                </button>
              </div>
              <p className="text-xs text-slate-300 pl-5">
                {selectedSourceIds.length} lista(s) monitorada(s)
              </p>
            </div>

            {/* Filtered Assignee / User Summary */}
            <div className="p-3 bg-slate-900/90 rounded-xl border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-400" />
                  <span>Responsável Filtrado:</span>
                </span>
                <button
                  onClick={handleOpenAssigneesStep}
                  className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  <span>Alterar responsável</span>
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 pl-5">
                {integration.selectedAssigneeIds && integration.selectedAssigneeIds.length > 0 ? (
                  (integration.selectedAssigneeNames && integration.selectedAssigneeNames.length > 0
                    ? integration.selectedAssigneeNames
                    : integration.selectedAssigneeIds
                  ).map((userName) => (
                    <span
                      key={userName}
                      className="text-[10px] font-semibold bg-blue-950/60 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-md flex items-center gap-1"
                    >
                      <UserCheck className="w-3 h-3" />
                      <span>{userName}</span>
                    </span>
                  ))
                ) : (
                  <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span>Qualquer responsável (Todas as tarefas)</span>
                  </span>
                )}
              </div>
            </div>

            {/* Filtered Statuses Summary */}
            <div className="p-3 bg-slate-900/90 rounded-xl border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-blue-400" />
                  <span>Status Filtrados:</span>
                </span>
                <button
                  onClick={handleProceedToStatuses}
                  className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  <span>Alterar status</span>
                </button>
              </div>
              <div className="flex flex-wrap gap-1 pl-5">
                {integration.selectedStatuses.map((st) => (
                  <span
                    key={st}
                    className="text-[10px] font-semibold bg-blue-950/60 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-md"
                  >
                    {st}
                  </span>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-2 flex items-center justify-between border-t border-white/5">
              <button
                type="button"
                onClick={handleDisconnect}
                className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Unlink className="w-3 h-3" />
                <span>Desconectar ClickUp</span>
              </button>

              <button
                type="button"
                onClick={() => SyncService.syncNow()}
                disabled={isSyncing}
                className="text-xs bg-blue-600 hover:bg-blue-500 text-white font-semibold py-1.5 px-3 rounded-xl flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Sincronizar agora</span>
              </button>
            </div>
          </div>
        )}

        {feedbackMessage && (
          <p className="text-[11px] text-emerald-400 flex items-center gap-1 pt-1">
            <Check className="w-3 h-3" />
            <span>{feedbackMessage}</span>
          </p>
        )}

        {errorMessage && (
          <p className="text-[11px] text-rose-400 flex items-center gap-1 pt-1">
            <span>{errorMessage}</span>
          </p>
        )}
      </div>

      {/* App Preferences */}
      <div className="p-3.5 bg-slate-950/60 border border-white/10 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-200">Preferências do DailyFlow</h3>
          {prefsSavedMessage && (
            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
              <Check className="w-3 h-3" />
              <span>{prefsSavedMessage}</span>
            </span>
          )}
        </div>
        
        <div className="space-y-2.5 text-xs text-slate-300">
          <label className="flex items-center justify-between cursor-pointer p-1.5 rounded-lg hover:bg-slate-900/60 transition-colors">
            <div>
              <span className="block font-medium">Iniciar com o sistema operacional</span>
              <span className="text-[10px] text-slate-500 block">Abrir a aba lateral automaticamente no boot</span>
            </div>
            <input
              type="checkbox"
              checked={autostart}
              onChange={(e) => setAutostart(e.target.checked)}
              className="rounded bg-slate-950 border-white/20 text-blue-600 cursor-pointer"
            />
          </label>
          <label className="flex items-center justify-between cursor-pointer p-1.5 rounded-lg hover:bg-slate-900/60 transition-colors">
            <div>
              <span className="block font-medium">Atalho global de teclado (Cmd+Shift+D)</span>
              <span className="text-[10px] text-slate-500 block">Atalho do sistema para abrir/fechar a aba</span>
            </div>
            <input
              type="checkbox"
              checked={globalShortcut}
              onChange={(e) => setGlobalShortcut(e.target.checked)}
              className="rounded bg-slate-950 border-white/20 text-blue-600 cursor-pointer"
            />
          </label>
        </div>

        <div className="pt-2 flex items-center justify-end border-t border-white/5">
          <button
            type="button"
            onClick={async () => {
              setIsSavingPrefs(true);
              await SettingsRepository.saveAppPreferences({ autostart, globalShortcut });
              setIsSavingPrefs(false);
              setPrefsSavedMessage('Preferências salvas com sucesso!');
              setTimeout(() => setPrefsSavedMessage(null), 3000);
            }}
            disabled={isSavingPrefs}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs py-1.5 px-3 rounded-xl transition-all shadow-sm flex items-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSavingPrefs ? 'Salvando...' : 'Salvar preferências'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
