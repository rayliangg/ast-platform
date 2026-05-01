use engine::parse_to_ast;
use serde::Deserialize;
use std::io::{self, Read};

#[derive(Debug, Deserialize)]
struct ParseRequest {
    language: String,
    source: String,
}

fn main() {
    let mut buffer = String::new();
    if let Err(err) = io::stdin().read_to_string(&mut buffer) {
        eprintln!("failed to read stdin: {err}");
        std::process::exit(1);
    }

    let req: ParseRequest = match serde_json::from_str(&buffer) {
        Ok(v) => v,
        Err(err) => {
            eprintln!("invalid json input: {err}");
            std::process::exit(1);
        }
    };

    let ast = match parse_to_ast(&req.language, &req.source) {
        Ok(ast) => ast,
        Err(err) => {
            eprintln!("{err}");
            std::process::exit(1);
        }
    };

    match serde_json::to_string_pretty(&ast) {
        Ok(json) => println!("{json}"),
        Err(err) => {
            eprintln!("failed to serialize ast: {err}");
            std::process::exit(1);
        }
    }
}
