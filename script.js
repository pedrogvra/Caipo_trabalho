// ==================== CONFIGURAÇÃO LOCAL ====================
let currentUser = null;      // { username, email, role }
let tasks = [];
let importantDates = [];
let activityLog = [];

// Usuários do sistema (apenas admin pode adicionar novos)
let users = {
    admin: { password: "mindy123", role: "Administrador", email: "admin@local.com", name: "Administrador" },
    user: { password: "user123", role: "Usuário", email: "user@local.com", name: "Usuário Comum" },
    "student@mindy.com": { password: "mindy", role: "Usuário", email: "student@mindy.com", name: "Estudante" },
    demo: { password: "demo", role: "Usuário", email: "demo@local.com", name: "Demonstração" }
};

// Carregar dados do localStorage
function loadLocalData() {
    const storedTasks = localStorage.getItem('mindy_tasks');
    if (storedTasks) tasks = JSON.parse(storedTasks);
    else initDefaultTasks();

    const storedDates = localStorage.getItem('mindy_dates');
    if (storedDates) importantDates = JSON.parse(storedDates);
    else initDefaultDates();

    const storedLogs = localStorage.getItem('mindy_logs');
    if (storedLogs) activityLog = JSON.parse(storedLogs);
    else activityLog = [];

    const storedUsers = localStorage.getItem('mindy_users');
    if (storedUsers) users = JSON.parse(storedUsers);
}

function saveData() {
    localStorage.setItem('mindy_tasks', JSON.stringify(tasks));
    localStorage.setItem('mindy_dates', JSON.stringify(importantDates));
    localStorage.setItem('mindy_logs', JSON.stringify(activityLog));
    localStorage.setItem('mindy_users', JSON.stringify(users));
}

function addLog(action, details) {
    const newLog = { action, details, timestamp: new Date().toLocaleString() };
    activityLog.unshift(newLog);
    if (activityLog.length > 100) activityLog.pop();
    saveData();
    renderDashboardSummaries();
    renderActivityLogIfOpen();
}

// Dados padrão
function initDefaultTasks() {
    tasks = [
        { id: 1, title: "Desenvolver Tela de Login", assignee: "Pedro G.", subtasks: [{name:"Criar formulário",assignee:"Pedro G."},{name:"Estilizar",assignee:"Larissa"}], description: "Página de acesso", status: "todo" },
        { id: 2, title: "Implementar Kanban Interativo", assignee: "Cristyan", subtasks: [{name:"Drag&Drop",assignee:"Cristyan"},{name:"Salvar estado",assignee:"David"}], description: "Quadro com colunas", status: "inProgress" },
        { id: 3, title: "Sistema de Popups e Logs", assignee: "Guilherme S.", subtasks: [{name:"Modal genérico",assignee:"Guilherme S."}], description: "Telas modais", status: "review" },
        { id: 4, title: "Configurar Scrum e Backlog", assignee: "Sarah", subtasks: [{name:"Dividir épicos",assignee:"Sarah"}], description: "Organização do time", status: "todo" }
    ];
    saveData();
    addLog("Sistema", "Tarefas padrão carregadas");
}

function initDefaultDates() {
    importantDates = [{ id: Date.now()+1, title: "Sprint Planning", date: "2026-04-20", description: "Reunião de planejamento" }];
    saveData();
    addLog("Data", "Data importante padrão adicionada");
}

// ==================== AUTENTICAÇÃO LOCAL ====================
function login(username, password) {
    const user = users[username];
    if (user && user.password === password) {
        currentUser = {
            username: username,
            email: user.email,
            role: user.role,
            name: user.name
        };
        addLog("Auth", `Usuário ${username} logou`);
        return true;
    }
    return false;
}

function logout() {
    currentUser = null;
    location.reload(); // recarrega para limpar tudo
}

function registerUser(name, email, password, role) {
    if (!currentUser || currentUser.role !== "Administrador") {
        throw new Error("Apenas o administrador pode criar novas contas.");
    }
    // Verifica se já existe
    if (users[email] || users[name.toLowerCase()]) {
        throw new Error("Usuário ou e-mail já existe.");
    }
    // Cria um username a partir do nome (sem espaços)
    let username = name.toLowerCase().replace(/\s/g, '');
    // Se já existe, adiciona um número
    let originalUsername = username;
    let counter = 1;
    while (users[username]) {
        username = originalUsername + counter;
        counter++;
    }
    users[username] = {
        password: password,
        role: role,
        email: email,
        name: name
    };
    saveData();
    addLog("Auth", `Nova conta criada: ${username} (${email}) com perfil ${role}`);
    return username;
}

function resetPassword(email) {
    // Simula envio de e-mail
    const userEntry = Object.values(users).find(u => u.email === email);
    if (userEntry) {
        alert(`📧 Link de redefinição enviado para ${email} (simulação).\nUsuário: ${Object.keys(users).find(k => users[k] === userEntry)}\nSenha atual: ${userEntry.password}`);
        addLog("Auth", `Redefinição de senha solicitada para ${email}`);
        return true;
    } else {
        alert("E-mail não encontrado no sistema.");
        return false;
    }
}

// ==================== CRUD DE TAREFAS ====================
function deleteTaskById(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    tasks = tasks.filter(t => t.id !== id);
    saveData();
    addLog("Delete", `Tarefa "${task.title}" removida`);
    renderKanbanBoard();
    refreshBacklogModalIfOpen();
    renderDashboardSummaries();
}

function moveTaskById(id, newStatus) {
    const task = tasks.find(t => t.id === id);
    if (!task || task.status === newStatus) return;
    const oldStatus = task.status;
    task.status = newStatus;
    saveData();
    addLog("Mover", `Tarefa "${task.title}" movida de ${oldStatus} para ${newStatus}`);
    renderKanbanBoard();
    refreshBacklogModalIfOpen();
    renderDashboardSummaries();
}

function saveTaskFromModal() {
    const title = document.getElementById("taskTitleInput").value.trim();
    if (!title) return alert("Título obrigatório");
    const assignee = document.getElementById("taskAssigneeInput").value;
    const desc = document.getElementById("taskDescInput").value;
    const status = document.getElementById("taskStatusInput").value;
    const subtasksRaw = document.getElementById("taskSubtasksInput").value;
    const subtasks = [];
    if (subtasksRaw) {
        subtasksRaw.split("\n").forEach(line => {
            line = line.trim();
            if (line) {
                let [namePart, assignPart] = line.split("@");
                let subtaskName = namePart.trim();
                let subtaskAssignee = assignPart ? assignPart.trim() : assignee;
                if (subtaskName) subtasks.push({ name: subtaskName, assignee: subtaskAssignee });
            }
        });
    }
    const editingId = document.getElementById("editingTaskId").value;
    if (editingId) {
        const task = tasks.find(t => t.id == editingId);
        if (task) {
            addLog("Editar", `Tarefa "${task.title}" atualizada`);
            task.title = title; task.assignee = assignee; task.description = desc; task.status = status; task.subtasks = subtasks;
        }
    } else {
        if (currentUser?.role !== "Administrador") return alert("Apenas administrador pode adicionar tarefas.");
        const newId = Date.now();
        tasks.push({ id: newId, title, assignee, subtasks, description: desc, status });
        addLog("Adicionar", `Tarefa "${title}" adicionada ao ${status}`);
    }
    saveData();
    document.getElementById("taskFormModal").style.display = "none";
    renderKanbanBoard();
    refreshBacklogModalIfOpen();
    renderDashboardSummaries();
}

// ==================== DATAS IMPORTANTES ====================
function addImportantDate(title, date, desc) {
    if (!title || !date) return;
    const newDate = { id: Date.now(), title, date, description: desc };
    importantDates.push(newDate);
    saveData();
    addLog("Data", `Data importante adicionada: ${title} (${date})`);
    renderImportantDates();
}

function renderImportantDates() {
    const container = document.getElementById("importantDatesList");
    if (container) {
        container.innerHTML = importantDates.map(d => `
            <div class="date-item">
                <i class="fas fa-calendar-alt"></i> <strong>${escapeHtml(d.title)}</strong> - ${d.date}<br>
                <small>${escapeHtml(d.description)}</small>
            </div>
        `).join("");
    }
}

// ==================== RENDER KANBAN ====================
function renderKanbanBoard() {
    const container = document.getElementById("kanbanColumnsContainer");
    if (!container) return;
    const columns = {
        todo: { name: "📌 A Fazer", tasks: [] },
        inProgress: { name: "⚙️ Em Andamento", tasks: [] },
        review: { name: "🔍 Em Revisão", tasks: [] },
        done: { name: "✅ Concluído", tasks: [] }
    };
    tasks.forEach(task => { if (columns[task.status]) columns[task.status].tasks.push(task); });
    container.innerHTML = "";
    const isAdmin = currentUser?.role === "Administrador";

    for (let [key, col] of Object.entries(columns)) {
        const colDiv = document.createElement("div");
        colDiv.className = "column";
        colDiv.innerHTML = `<h3>${col.name} <span>${col.tasks.length}</span></h3><div class="column-tasks" data-status="${key}"></div>`;
        const tasksContainer = colDiv.querySelector(".column-tasks");
        col.tasks.forEach(task => {
            const taskCard = document.createElement("div");
            taskCard.className = "task-card";
            if (isAdmin) taskCard.draggable = true;
            taskCard.dataset.taskId = task.id;
            const subtasksHtml = task.subtasks?.length ? `<div class="subtasks-badge"><i class="fas fa-tasks"></i> ${task.subtasks.length} subtarefa(s)</div>` : "";
            const actionButtons = isAdmin ? `
                <div class="task-actions">
                    <button class="edit-task" data-id="${task.id}"><i class="fas fa-edit"></i> Editar</button>
                    <button class="delete-task" data-id="${task.id}"><i class="fas fa-trash"></i> Deletar</button>
                </div>
            ` : "";
            taskCard.innerHTML = `
                <div class="task-title">${escapeHtml(task.title)}</div>
                <div class="task-assignee"><i class="fas fa-user"></i> ${task.assignee || "Não atribuído"}</div>
                ${subtasksHtml}
                ${actionButtons}
            `;
            tasksContainer.appendChild(taskCard);
        });
        if (isAdmin) {
            colDiv.addEventListener("dragover", (e) => e.preventDefault());
            colDiv.addEventListener("drop", (e) => {
                e.preventDefault();
                const draggedId = window.draggedTaskId;
                if (draggedId) moveTaskById(parseInt(draggedId), key);
                window.draggedTaskId = null;
            });
        }
        container.appendChild(colDiv);
    }
    attachTaskEvents();
}

function attachTaskEvents() {
    document.querySelectorAll('.edit-task').forEach(btn => {
        btn.onclick = (e) => { e.stopPropagation(); openTaskModal(parseInt(btn.dataset.id)); };
    });
    document.querySelectorAll('.delete-task').forEach(btn => {
        btn.onclick = (e) => { e.stopPropagation(); deleteTaskById(parseInt(btn.dataset.id)); };
    });
    if (currentUser?.role === "Administrador") {
        document.querySelectorAll('.task-card').forEach(card => {
            card.addEventListener('dragstart', (e) => {
                window.draggedTaskId = card.dataset.taskId;
                e.dataTransfer.setData('text/plain', card.dataset.taskId);
            });
        });
    }
}

// ==================== LOGS E RESUMOS ====================
function renderActivityLog() {
    const container = document.getElementById("activityLogList");
    if (container) {
        container.innerHTML = activityLog.map(log => `
            <div class="log-item">[${log.timestamp}] <strong>${log.action}</strong>: ${log.details}</div>
        `).join("");
        if (activityLog.length === 0) container.innerHTML = "<div class='log-item'>Nenhum log disponível.</div>";
    }
}

function renderDashboardSummaries() {
    const backlogAdmin = document.getElementById("dashboardBacklogUpdatesAdmin");
    const kanbanAdmin = document.getElementById("dashboardKanbanUpdatesAdmin");
    const kanbanUser = document.getElementById("dashboardKanbanUpdatesUser");

    const recentLogs = activityLog.slice(0, 4);
    if (backlogAdmin) {
        backlogAdmin.innerHTML = recentLogs.length
            ? recentLogs.map(log => `<div class="info-item">${escapeHtml(log.details)}</div>`).join("")
            : `<div class="info-item">Nenhuma modificação recente.</div>`;
    }

    const recentTasks = tasks.slice(-4).reverse();
    const taskStatusMap = { todo: 'A Fazer', inProgress: 'Em Andamento', review: 'Em Revisão', done: 'Concluído' };
    const kanbanHtml = recentTasks.map(t => `<div class="info-item"><strong>${escapeHtml(t.title)}</strong><br>${taskStatusMap[t.status] || t.status}</div>`).join("");
    if (kanbanAdmin) kanbanAdmin.innerHTML = recentTasks.length ? kanbanHtml : `<div class="info-item">Nenhuma alteração no Kanban.</div>`;
    if (kanbanUser) kanbanUser.innerHTML = recentTasks.length ? kanbanHtml : `<div class="info-item">Nenhuma alteração disponível.</div>`;
}

function renderActivityLogIfOpen() {
    const backlogModal = document.getElementById("backlogModal");
    if (backlogModal && backlogModal.style.display === "flex") {
        renderActivityLog();
        updateTaskSelects();
    }
}

function updateTaskSelects() {
    const deleteSelect = document.getElementById("deleteTaskSelect");
    const moveSelect = document.getElementById("moveTaskSelect");
    if (deleteSelect) deleteSelect.innerHTML = tasks.map(t => `<option value="${t.id}">${t.title} (${t.assignee})</option>`).join("");
    if (moveSelect) moveSelect.innerHTML = tasks.map(t => `<option value="${t.id}">${t.title}</option>`).join("");
}

function refreshBacklogModalIfOpen() {
    const backlogModal = document.getElementById("backlogModal");
    if (backlogModal && backlogModal.style.display === "flex") {
        renderActivityLog();
        updateTaskSelects();
    }
}

// ==================== PERMISSÕES E UI ====================
function showDashboardForRole() {
    const adminDash = document.getElementById("dashboard");
    const userDash = document.getElementById("userDashboard");
    if (currentUser?.role === "Administrador") {
        if (adminDash) adminDash.style.display = "block";
        if (userDash) userDash.style.display = "none";
    } else {
        if (adminDash) adminDash.style.display = "none";
        if (userDash) userDash.style.display = "block";
    }
    document.getElementById("currentUserEmail").innerText = currentUser?.email || currentUser?.username;
    document.getElementById("currentUserRole").innerText = currentUser?.role || "Usuário";
    updateTaskPermissions();
}

function updateTaskPermissions() {
    const isAdmin = currentUser?.role === "Administrador";
    const adminOnlyButtons = ["openAddTaskGlobalBtn", "backlogAddTaskBtn", "addImportantDateBtn", "backlogAddDateBtn"];
    adminOnlyButtons.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.style.display = isAdmin ? "inline-flex" : "none";
            btn.disabled = !isAdmin;
        }
    });
    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = isAdmin ? '' : 'none';
    });
    const createAccountBtn = document.getElementById("createAccountBtn");
    if (createAccountBtn) {
        createAccountBtn.style.display = isAdmin ? "inline-block" : "none";
    }
}

function openTaskModal(taskId = null) {
    if (taskId !== null && currentUser?.role !== "Administrador") {
        alert("Somente administrador pode editar tarefas.");
        return;
    }
    const modal = document.getElementById("taskFormModal");
    const titleInp = document.getElementById("taskTitleInput");
    const assigneeSel = document.getElementById("taskAssigneeInput");
    const subtasksArea = document.getElementById("taskSubtasksInput");
    const descArea = document.getElementById("taskDescInput");
    const statusSel = document.getElementById("taskStatusInput");
    if (taskId) {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            document.getElementById("taskFormTitle").innerText = "Editar Tarefa";
            titleInp.value = task.title;
            assigneeSel.value = task.assignee || "";
            descArea.value = task.description || "";
            statusSel.value = task.status;
            const subtasksStr = task.subtasks.map(st => `${st.name} @${st.assignee}`).join("\n");
            subtasksArea.value = subtasksStr;
            document.getElementById("editingTaskId").value = taskId;
        }
    } else {
        document.getElementById("taskFormTitle").innerText = "Nova Tarefa";
        titleInp.value = "";
        assigneeSel.value = "";
        descArea.value = "";
        statusSel.value = "todo";
        subtasksArea.value = "";
        document.getElementById("editingTaskId").value = "";
    }
    modal.style.display = "flex";
}

// ==================== EVENTOS ====================
function handleLogin() {
    const userInput = document.getElementById("loginUser").value.trim();
    const pass = document.getElementById("loginPass").value.trim();
    const errorEl = document.getElementById("loginError");
    errorEl.innerText = "";
    if (!userInput || !pass) {
        errorEl.innerText = "Digite usuário e senha.";
        return;
    }
    const success = login(userInput, pass);
    if (success) {
        document.getElementById("loginScreen").style.display = "none";
        renderImportantDates();
        renderKanbanBoard();
        renderDashboardSummaries();
        showDashboardForRole();
    } else {
        errorEl.innerText = "Credenciais inválidas. Use admin/mindy123, user/user123, student@mindy.com/mindy ou demo/demo";
    }
}

function handleRegister() {
    if (!currentUser || currentUser.role !== "Administrador") {
        alert("Apenas o administrador pode criar novas contas.");
        return;
    }
    const name = document.getElementById("newUserName").value;
    const email = document.getElementById("newUserEmail").value;
    const role = document.getElementById("newUserRole").value;
    const password = document.getElementById("newUserPassword").value;
    const confirm = document.getElementById("newUserConfirmPassword").value;
    const msg = document.getElementById("registerMessage");
    if (!name || !email || !password || !confirm) {
        msg.innerText = "Preencha todos os campos.";
        return;
    }
    if (password !== confirm) {
        msg.innerText = "Senhas não coincidem.";
        return;
    }
    try {
        const newUsername = registerUser(name, email, password, role);
        msg.style.color = "green";
        msg.innerText = `Conta criada! Usuário: ${newUsername} | Senha: ${password}`;
        setTimeout(() => {
            document.getElementById("createAccountModal").style.display = "none";
            document.getElementById("newUserName").value = "";
            document.getElementById("newUserEmail").value = "";
            document.getElementById("newUserPassword").value = "";
            document.getElementById("newUserConfirmPassword").value = "";
            msg.innerText = "";
        }, 3000);
    } catch (err) {
        msg.style.color = "red";
        msg.innerText = err.message;
    }
}

function handleForgotPassword() {
    const email = document.getElementById("forgotPasswordEmail").value;
    if (!email) {
        document.getElementById("forgotPasswordMessage").innerText = "Digite seu email.";
        return;
    }
    resetPassword(email);
    document.getElementById("forgotPasswordMessage").innerText = "Link enviado (simulação). Verifique o alerta.";
    setTimeout(() => {
        document.getElementById("forgotPasswordModal").style.display = "none";
    }, 2000);
}

function attachGlobalEvents() {
    document.getElementById("doLoginBtn")?.addEventListener("click", handleLogin);
    document.getElementById("loginUser")?.addEventListener("keypress", e => e.key === "Enter" && handleLogin());
    document.getElementById("loginPass")?.addEventListener("keypress", e => e.key === "Enter" && handleLogin());

    document.querySelector(".forgot-link")?.addEventListener("click", (e) => {
        e.preventDefault();
        document.getElementById("forgotPasswordModal").style.display = "flex";
    });
    document.getElementById("sendResetLinkBtn")?.addEventListener("click", handleForgotPassword);

    document.getElementById("createAccountBtn")?.addEventListener("click", () => {
        if (currentUser?.role !== "Administrador") {
            alert("Apenas o administrador pode criar novas contas.");
            return;
        }
        document.getElementById("createAccountModal").style.display = "flex";
    });
    document.getElementById("registerUserBtn")?.addEventListener("click", handleRegister);

    document.getElementById("logoutBtn")?.addEventListener("click", logout);
    document.getElementById("logoutBtnUser")?.addEventListener("click", logout);
    document.getElementById("logoutFromModalBtn")?.addEventListener("click", logout);

    document.getElementById("mindyCard")?.addEventListener("click", () => { renderImportantDates(); document.getElementById("mindyModal").style.display = "flex"; });
    document.getElementById("integrantesCard")?.addEventListener("click", () => document.getElementById("integrantesModal").style.display = "flex");
    document.getElementById("backlogCard")?.addEventListener("click", () => { renderActivityLog(); updateTaskSelects(); document.getElementById("backlogModal").style.display = "flex"; });
    document.getElementById("kanbanCard")?.addEventListener("click", () => {
        document.getElementById("dashboard").style.display = "none";
        document.getElementById("userDashboard").style.display = "none";
        document.getElementById("kanbanView").style.display = "flex";
        renderKanbanBoard();
    });
    document.getElementById("contaCard")?.addEventListener("click", () => document.getElementById("contaModal").style.display = "flex");

    document.getElementById("userMindyCard")?.addEventListener("click", () => { renderImportantDates(); document.getElementById("mindyModal").style.display = "flex"; });
    document.getElementById("userIntegrantesCard")?.addEventListener("click", () => document.getElementById("integrantesModal").style.display = "flex");
    document.getElementById("userBacklogCard")?.addEventListener("click", () => { renderActivityLog(); updateTaskSelects(); document.getElementById("backlogModal").style.display = "flex"; });
    document.getElementById("userKanbanCard")?.addEventListener("click", () => {
        document.getElementById("dashboard").style.display = "none";
        document.getElementById("userDashboard").style.display = "none";
        document.getElementById("kanbanView").style.display = "flex";
        renderKanbanBoard();
    });
    document.getElementById("userContaCard")?.addEventListener("click", () => document.getElementById("contaModal").style.display = "flex");

    document.getElementById("backToDashboardBtn")?.addEventListener("click", () => {
        document.getElementById("kanbanView").style.display = "none";
        showDashboardForRole();
    });
    document.getElementById("openAddTaskGlobalBtn")?.addEventListener("click", () => openTaskModal(null));
    document.getElementById("addImportantDateBtn")?.addEventListener("click", () => {
        const title = document.getElementById("newDateTitle").value;
        const date = document.getElementById("newDateValue").value;
        const desc = document.getElementById("newDateDesc").value;
        addImportantDate(title, date, desc);
        document.getElementById("newDateTitle").value = "";
        document.getElementById("newDateValue").value = "";
        document.getElementById("newDateDesc").value = "";
    });
    document.getElementById("backlogAddTaskBtn")?.addEventListener("click", () => openTaskModal(null));
    document.getElementById("backlogAddDateBtn")?.addEventListener("click", () => document.getElementById("mindyModal").style.display = "flex");
    document.getElementById("backlogDeleteTaskBtn")?.addEventListener("click", () => {
        const id = parseInt(document.getElementById("deleteTaskSelect").value);
        if (id) deleteTaskById(id);
        refreshBacklogModalIfOpen();
    });
    document.getElementById("backlogMoveTaskBtn")?.addEventListener("click", () => {
        const id = parseInt(document.getElementById("moveTaskSelect").value);
        const newCol = document.getElementById("moveToColumnSelect").value;
        if (id) moveTaskById(id, newCol);
        refreshBacklogModalIfOpen();
    });
    document.getElementById("resetLocalDataBtn")?.addEventListener("click", () => {
        if (confirm("Isso apagará todos os dados do localStorage. Deseja continuar?")) {
            localStorage.clear();
            alert("Dados resetados. Recarregue a página.");
            logout();
        }
    });
    document.getElementById("saveTaskBtn")?.addEventListener("click", saveTaskFromModal);

    document.querySelectorAll(".close-modal").forEach(btn => {
        btn.addEventListener("click", function() { this.closest(".modal").style.display = "none"; });
    });
    window.onclick = (e) => { if (e.target.classList?.contains("modal")) e.target.style.display = "none"; };
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Inicialização
window.addEventListener("DOMContentLoaded", () => {
    loadLocalData();
    attachGlobalEvents();
    // Mostra tela de login, a menos que já exista sessão (mas vamos sempre mostrar login)
    document.getElementById("loginScreen").style.display = "flex";
    document.getElementById("dashboard").style.display = "none";
    document.getElementById("userDashboard").style.display = "none";
    document.getElementById("kanbanView").style.display = "none";
});