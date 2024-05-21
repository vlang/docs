module main

import os

fn clean_output_directory() ! {
	if os.exists(output_path) {
		os.rmdir_all(output_path)!
	}
}

fn create_output_directory() ! {
	if !os.exists(output_path) {
		os.mkdir(output_path)!
	}
}

fn copy_assets_to_output() ! {
	os.cp_all(os.join_path(template_path, 'assets'), os.join_path(output_path, 'assets'),
		true)!
}

fn write_output_file(filename string, content string) ! {
	os.write_file(os.join_path(output_path, filename), content)!
}

fn title_to_filename(title string) string {
	filename := title.replace_each(['[', '', ']', '', ' ', '-', '`', '', '/', '', '\\', '', ':',
		'']).to_lower()
	return filename
}
