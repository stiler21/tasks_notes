let http = require('http');
let fs = require('fs');
let syncsql = require('sync-mysql');
let bodyParser = require('body-parser');
let express = require('express');
let app = express();
let session = require('express-session');
let cookieParser = require('cookie-parser');
var connection;
let MySqlStore = require('express-mysql-session')(session);
const port = 8080;

let options = {
    host: 'us-cdbr-east-02.cleardb.com',
    port: 3306,
    user: 'bf6bb0b90558bd',
    password: '1869c24b',
    database: 'heroku_a20a8e2cff977f0'
}

let sessionStore = new MySqlStore(options);

app.use(session({
    key: 'session_cookie_name',
    secret: 'session_cookie_secret',
    store: sessionStore,
    cookie: { path: '/', httpOnly: true, maxAge: null},
    resave: false,
    saveUninitialized: false
}));

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(express.static(__dirname + '/DataTables'));
app.use(express.static(__dirname));

function check_user(u_name, u_password) {
    let q = 'select * from users1 where name = ' + '\'' + u_name + '\'';
    let res = connection.query(q);
    if (res.length > 0) {
        return true;
    }
    return false;
}

function log_process(u_name, u_password) {
    if (check_user(u_name, u_password)) {
        let q = 'select * from users1 where name = ' + '\'' + u_name + '\'' + ' and password = ' + '\'' + u_password + '\'';
        let res = connection.query(q);
        if (res.length > 0) {
            return 'logged';
        }
        return 'wrong password';
    } else {
        return 'user does not exist';
    }
}

function reg_process(u_name, u_password) {
    if (!check_user(u_name, u_password)) {
        let q = 'insert into users1 values(' + '\'' + u_name + '\'' + ',' + '\'' + u_password + '\'' + ')';
        connection.query(q);
        return 'registered';
    } else {
        return 'user already exists';        
    }
} 

function show_projects(u_name) {
    let q = 'select pr_name from projects where user_name = ' + '\'' + u_name + '\'';
    let res = connection.query(q);
    return res;
}

app.post("/showprojects", (req, res) => {
    let arr = show_projects(req.body["user"]);
    res.json(arr);
});

function add_project(user, project) {
    let q = 'insert into projects values (' + '\'' + project + '\'' + ',' + '\'' + user + '\'' + ')';
    connection.query(q);
    return 'added';
}

app.post("/newproject", (req, res) => {
    res.send(add_project(req.body["user"], req.body["project"]));
});

function delete_project(project, user) {
    let q = 'delete from tasks where project = ' + '\'' + project + '\'' + ' and user_name = ' + '\'' + user + '\'';
    connection.query(q);
    q = 'delete from projects where pr_name = ' + '\'' + project + '\'' + ' and user_name = ' + '\'' + user + '\'';
    connection.query(q);
    return 'deleted';
}

function add_task(user, project, task, priority) {
    let q = 'insert into tasks values (' + '\'' + task + '\'' + ',' + '\'' + project + '\'' + ',' + '\'' + user + '\'' + ',' + 'null' + ',' + '\'' + priority + '\'' + ',' + '0' + ')';
    connection.query(q);
    return 'added';
}

app.post("/newtask", (req, res) => {
    res.send(add_task(req.body["user"], req.body["project"], req.body["task"], req.body["priority"]));
});

function delete_task(user, project, task, priority) {
    let q = 'update tasks set priority = priority - 1 where priority > ' + '\'' + priority + '\'' + ' and project = ' + '\'' + project + '\'' + ' and user_name = ' + '\'' + user + '\'';
    connection.query(q);
    q = 'delete from tasks where name = ' + '\'' + task + '\'' + ' and project = ' + '\'' + project + '\'' + ' and user_name = ' + '\'' + user + '\'';
    connection.query(q);
    return 'deleted';
}

app.post("/delete_task", (req, res) => {
    res.send(delete_task(req.body["user"], req.body["project"], req.body["task"], req.body["priority"]));
});

function show_tasks(user, project) {
    let q = 'select *, year(term) as \'year\', month(term) as \'month\', day(term) as \'day\', hour(term) as \'hour\', minute(term) as \'minute\', second(term) as \'second\' from tasks where project = ' + '\'' + project + '\'' + ' and  user_name = ' + '\'' + user + '\' order by priority';
    //let q = 'select *, FORMAT(term, \'yyyy\') as \'year\', FORMAT(term, \'mm\') as \'month\', FORMAT(term, \'dd\') as \'day\', FORMAT(term, \'hh\') as \'hour\', FORMAT(term, \'mm\') as \'minute\', FORMAT(term, \'ss\') as \'second\' from tasks where project = ' + '\'' + project + '\'' + ' and  user_name = ' + '\'' + user + '\'';
    let res = connection.query(q);
    return res;
}

app.post("/showtasks", (req, res) => {
    res.send(show_tasks(req.body["user"], req.body["project"]));
});

function change_date(user, project, task, new_date) {
    let q = 'update tasks set term = ' + '\'' + new_date + '\'' + ' where user_name = ' + '\'' + user + '\'' + ' and project = ' + '\'' + project + '\'' + ' and name = ' + '\'' + task + '\'';
    connection.query(q);
    return 'updated';
}

app.post("/change_date", (req, res) => {
    res.send(change_date(req.body["user"], req.body["project"], req.body["task"], req.body["new_date"]));
});

function change_checkbox(user, project, task, check) {
    let q = 'update tasks set status = ' + '\'' + check + '\'' + ' where user_name = ' + '\'' + user + '\'' + ' and project = ' + '\'' + project + '\'' + ' and name = ' + '\'' + task + '\'';
    connection.query(q);
    return 'updated';
}

app.post("/change_checkbox", (req, res) => {
    res.send(change_checkbox(req.body["user"], req.body["project"], req.body["task"], req.body["check"]));
});

function change_priority(user, project, task_down, task_up) {
    let q = 'update tasks set priority = priority + 1  where user_name = ' + '\'' + user + '\'' + ' and project = ' + '\'' + project + '\'' + ' and name = ' + '\'' + task_down + '\'';
    connection.query(q);
    q = 'update tasks set priority = priority - 1  where user_name = ' + '\'' + user + '\'' + ' and project = ' + '\'' + project + '\'' + ' and name = ' + '\'' + task_up + '\'';
    connection.query(q);
    return 'changed';
}

app.post("/change_priority", (req, res) => {
    res.send(change_priority(req.body["user"], req.body["project"], req.body["task_down"], req.body["task_up"]));
});

app.post("/delete_project", (req, res) => {
    res.send(delete_project(req.body["project"], req.body["user"]));
});

function edit_project(user, current_project, new_project) {
    let q = 'update projects set pr_name = ' + '\'' + new_project + '\'' + 'where pr_name = ' + '\'' + current_project + '\'' + ' and user_name = ' + '\'' + user + '\'';
    connection.query(q);
    return 'edited';
}

app.post("/edit_project", (req, res) => {
    res.send(edit_project(req.body["user"], req.body["current_project"], req.body["new_project"]));
});

function edit_task(user, project, task, newtask) {
    let q = 'Update tasks set name = ' + '\'' + newtask + '\'' + ' where user_name = ' + '\'' + user + '\'' + ' and project = ' + '\'' + project + '\'' + ' and name = ' + '\'' + task + '\'';
    connection.query(q);
    return 'edited';
}

app.post("/edit_task", (req, res) => {
    res.send(edit_task(req.body["user"], req.body["project"], req.body["task"], req.body["newtask"]));
});

app.post("/reg", (req, res) => {
    let result = reg_process(req.body["name"], req.body["password"]);
    if (result == 'registered') {
        var session_data = req.session;
        session_data.user = req.body["name"];
    }
    res.send(result);
});

app.post("/log", (req, res) => {
    let result = log_process(req.body["name"], req.body["password"]);
    if (result == 'logged') {
        var session_data = req.session;
        session_data.user = req.body["name"];
    }
    res.send(result);
});

app.post("/logout", (req, res) => {
    req.session.destroy();
    res.clearCookie("user_name");
    res.send("logout");
});

app.get("/",(req, res) => {
    connection = new syncsql({
        host: 'us-cdbr-east-02.cleardb.com',
        user: 'bf6bb0b90558bd',
        password: '1869c24b',
        database: 'heroku_a20a8e2cff977f0'
    });
    fs.readFile('planner.html', {encoding: 'utf8'}, function(err, data){
        if (!err) {
            if (req.session.user) {
                let sname = req.session.user;
                res.cookie("user_name", sname);
            }
            res.end(data);
        }
    });
    
});

app.listen(process.env.PORT || port);
