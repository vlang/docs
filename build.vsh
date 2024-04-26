import os

commit_res := os.execute('git ls-remote -h https://github.com/vlang/v.git refs/heads/master')
latest_v_commit_hash := commit_res.output.all_before('\t')#[..7]
println('Latest V master commit hash: $latest_v_commit_hash')

os.system('rm -rf docs_generator/')
os.system('git clone --branch generator https://github.com/vlang/docs docs_generator/')
os.chdir('docs_generator/')!

os.system('v install')
os.system('v run .')
os.system('mv output/* ../')

os.chdir('..')!
os.system('git add .')
os.system('git commit -m "${latest_v_commit_hash} - update doc pages"')

println('Done')
