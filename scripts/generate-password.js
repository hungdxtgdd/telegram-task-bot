#!/usr/bin/env node

const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('🔐 Password Hash Generator');
console.log('========================\n');

rl.question('Nhập mật khẩu mới: ', async (password) => {
    if (!password) {
        console.log('❌ Mật khẩu không được để trống!');
        rl.close();
        return;
    }

    if (password.length < 6) {
        console.log('❌ Mật khẩu phải có ít nhất 6 ký tự!');
        rl.close();
        return;
    }

    try {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        console.log('\n✅ Mật khẩu đã được hash thành công!');
        console.log('📋 Copy đoạn code sau vào file api/auth.js:');
        console.log('─'.repeat(60));
        console.log(`password: '${hashedPassword}',`);
        console.log('─'.repeat(60));
        console.log('\n⚠️  Lưu ý: Hãy thay thế password cũ trong users array!');
        
    } catch (error) {
        console.error('❌ Lỗi khi hash mật khẩu:', error.message);
    }
    
    rl.close();
});

rl.on('close', () => {
    console.log('\n👋 Tạm biệt!');
    process.exit(0);
});
