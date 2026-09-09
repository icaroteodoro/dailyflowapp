use keyring::Entry;
use tauri::{AppHandle, LogicalPosition, LogicalSize, Manager};
use tauri_plugin_sql::{Migration, MigrationKind};

#[tauri::command]
fn save_secure_token(service: String, account: String, token: String) -> Result<(), String> {
    let entry = Entry::new(&service, &account).map_err(|e| e.to_string())?;
    entry.set_password(&token).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_secure_token(service: String, account: String) -> Result<Option<String>, String> {
    let entry = Entry::new(&service, &account).map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(token) => Ok(Some(token)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn delete_secure_token(service: String, account: String) -> Result<(), String> {
    let entry = Entry::new(&service, &account).map_err(|e| e.to_string())?;
    match entry.delete_credential() {
        Ok(_) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn set_drawer_state(app: AppHandle, expanded: bool) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        if let Ok(Some(monitor)) = window.current_monitor() {
            let screen_size = monitor.size();
            let scale_factor = monitor.scale_factor();
            let screen_w = screen_size.width as f64 / scale_factor;
            let screen_h = screen_size.height as f64 / scale_factor;

            let drawer_h = (740.0_f64).min(screen_h - 40.0);
            let y_pos = ((screen_h - drawer_h) / 2.0).max(20.0);

            if expanded {
                let drawer_w = 420.0_f64;
                let x_pos = screen_w - drawer_w;
                let _ = window.set_size(LogicalSize::new(drawer_w, drawer_h));
                let _ = window.set_position(LogicalPosition::new(x_pos, y_pos));
            } else {
                let handle_w = 44.0_f64;
                let handle_h = 120.0_f64;
                let x_pos = screen_w - handle_w;
                let handle_y = ((screen_h - handle_h) / 2.0).max(20.0);
                let _ = window.set_size(LogicalSize::new(handle_w, handle_h));
                let _ = window.set_position(LogicalPosition::new(x_pos, handle_y));
            }
        }
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: "
                CREATE TABLE IF NOT EXISTS integrations (
                    id TEXT PRIMARY KEY,
                    provider TEXT NOT NULL,
                    is_active INTEGER NOT NULL DEFAULT 1,
                    selected_sources TEXT NOT NULL DEFAULT '[]',
                    last_sync_at TEXT,
                    created_at TEXT NOT NULL DEFAULT (datetime('now'))
                );

                CREATE TABLE IF NOT EXISTS tasks_cache (
                    id TEXT PRIMARY KEY,
                    external_id TEXT NOT NULL,
                    provider TEXT NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT,
                    status TEXT NOT NULL,
                    available_statuses TEXT,
                    source_id TEXT NOT NULL,
                    source_name TEXT NOT NULL,
                    due_date TEXT,
                    url TEXT NOT NULL,
                    raw_payload TEXT,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS daily_plans (
                    id TEXT PRIMARY KEY,
                    date TEXT UNIQUE NOT NULL,
                    created_at TEXT NOT NULL DEFAULT (datetime('now'))
                );

                CREATE TABLE IF NOT EXISTS daily_plan_items (
                    id TEXT PRIMARY KEY,
                    plan_id TEXT NOT NULL,
                    task_id TEXT NOT NULL,
                    sort_order INTEGER NOT NULL DEFAULT 0,
                    completed_locally INTEGER NOT NULL DEFAULT 0,
                    completed_at TEXT,
                    FOREIGN KEY(plan_id) REFERENCES daily_plans(id) ON DELETE CASCADE,
                    FOREIGN KEY(task_id) REFERENCES tasks_cache(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                );
            ",
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:dailyflow.db", migrations)
                .build(),
        )
        .setup(|app| {
            let handle = app.handle().clone();
            if let Some(window) = app.get_webview_window("main") {
                if let Some(icon) = app.default_window_icon() {
                    let _ = window.set_icon(icon.clone());
                }
            }

            #[cfg(target_os = "macos")]
            {
                use objc2::ClassType;
                use objc2_app_kit::{NSApplication, NSImage};
                use objc2_foundation::{MainThreadMarker, NSData};

                unsafe {
                    let mtm = MainThreadMarker::new_unchecked();
                    let bytes = include_bytes!("../icons/128x128@2x.png");
                    let data = NSData::with_bytes(bytes);
                    if let Some(image) = NSImage::initWithData(NSImage::alloc(), &data) {
                        let app = NSApplication::sharedApplication(mtm);
                        app.setApplicationIconImage(Some(&image));
                    }
                }
            }

            let _ = set_drawer_state(handle, true);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            save_secure_token,
            get_secure_token,
            delete_secure_token,
            set_drawer_state
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
