const { copyFileSync, mkdirSync } = require('fs');
const { existsSync } = require('fs');

// 创建 dist 目录
if (!existsSync('dist')) {
  mkdirSync('dist', { recursive: true });
}

// 复制文件到 dist 目录
const filesToCopy = [
  { src: 'src/index.html', dest: 'dist/index.html' },
  { src: 'src/manifest.json', dest: 'dist/manifest.json' }
];

filesToCopy.forEach(({ src, dest }) => {
  if (existsSync(src)) {
    copyFileSync(src, dest);
    console.log(`✓ 已复制: ${src} -> ${dest}`);
  }
});

// 复制整个目录
const { execSync } = require('child_process');

try {
  // 复制样式文件
  if (existsSync('src/styles')) {
    if (!existsSync('dist/styles')) {
      mkdirSync('dist/styles', { recursive: true });
    }
    execSync('xcopy /E /I /Y src\\styles dist\\styles', { stdio: 'inherit' });
  }
  
  // 复制 JS 文件
  if (existsSync('src/js')) {
    if (!existsSync('dist/js')) {
      mkdirSync('dist/js', { recursive: true });
    }
    execSync('xcopy /E /I /Y src\\js dist\\js', { stdio: 'inherit' });
  }
  
  // 复制资源文件
  if (existsSync('src/assets')) {
    if (!existsSync('dist/assets')) {
      mkdirSync('dist/assets', { recursive: true });
    }
    execSync('xcopy /E /I /Y src\\assets dist\\assets', { stdio: 'inherit' });
  }
  
  console.log('✓ 构建完成！');
} catch (error) {
  console.error('构建过程中出现错误:', error.message);
  process.exit(1);
}
