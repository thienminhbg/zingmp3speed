'use strict';

document.addEventListener('DOMContentLoaded', () => {

    const form = document.getElementById('searchForm');
    const input = document.getElementById('url');
    const button = document.getElementById('submit');
    const status = document.getElementById('status');

    const result = document.getElementById('result');
    const cover = document.getElementById('cover');
    const title = document.getElementById('title');
    const artist = document.getElementById('artist');
    const player = document.getElementById('player');
    const download = document.getElementById('download');

    const albumBox = document.getElementById('albumBox');
    const albumTitle = document.getElementById('albumTitle');
    const albumList = document.getElementById('albumList');
    const downloadAll = document.getElementById('downloadAll');
    const selectAll = document.getElementById('selectAll');
    const pasteButton = document.getElementById('pasteButton');

    function clearPreviousResults() {

        /* Ẩn toàn bộ kết quả cũ */
        result.hidden = true;
        albumBox.hidden = true;

        /* Xóa danh sách album / playlist cũ */
        albumList.innerHTML = '';

        /* Xóa tiêu đề album cũ */
        albumTitle.textContent = '';

        /* Xóa thông tin bài hát cũ */
        title.textContent = '';
        artist.textContent = '';

        /* Xóa ảnh cũ */
        cover.removeAttribute('src');

        /* Dừng và xóa audio cũ */
        player.pause();
        player.removeAttribute('src');
        player.load();

        /* Xóa link tải cũ */
        download.removeAttribute('href');

        /* Đưa nút chọn tất cả về trạng thái ban đầu */
        if (selectAll) {
            selectAll.textContent = '☑ CHỌN TẤT CẢ';
        }
    }


    function msg(text, error = false) {
        status.textContent = text;
        status.className = error ? 'status error' : 'status';
    }

    function getId(value) {
        const text = value.trim();

        if (/^[A-Za-z0-9]{8,20}$/.test(text)) {
            return text;
        }

        const match = text.match(
            /\/([A-Za-z0-9]{8,20})(?:\.html)?(?:[?#].*)?\/?$/
        );

        return match ? match[1] : null;
    }

    async function api(path) {
        msg('Đang kết nối máy chủ...');

        const response = await fetch(path, {
            method: 'GET',
            cache: 'no-store',
            headers: {
                'Accept': 'application/json'
            }
        });

        const text = await response.text();

        console.log('API:', path);
        console.log('STATUS:', response.status);
        console.log('RESPONSE:', text);

        let data;

        try {
            data = JSON.parse(text);
        } catch {
            throw new Error('API không trả về JSON hợp lệ.');
        }

        if (!response.ok) {
            throw new Error(
                data.msg ||
                data.error ||
                'API HTTP ' + response.status
            );
        }

        if (data.err && String(data.err) !== '0') {
            throw new Error(data.msg || 'API trả về lỗi.');
        }

        return data;
    }

    async function showSong(song, id) {

        const songId = song.encodeId || id;

        if (!songId) {
            throw new Error('Không có ID bài hát.');
        }

        title.textContent = song.title || 'Không có tên bài hát';

        artist.textContent =
            song.artistsNames ||
            song.artist?.name ||
            'Không rõ nghệ sĩ';

        const image =
            song.thumbnailM ||
            song.thumbnail ||
            song.thumbnailV2;

        if (image) {
            cover.src = image;
        }

        /* =========================
           STREAM MIỄN PHÍ CHO WEBSITE
           ========================= */

        player.pause();
        player.removeAttribute('src');
        player.load();

        try {

            const response = await fetch(
                '/api/song/stream?id=' +
                encodeURIComponent(songId),
                {
                    method: 'GET',
                    cache: 'no-store',
                    headers: {
                        'Accept': 'application/json'
                    }
                }
            );

            const data = await response.json();

            if (!response.ok || !data.url) {
                throw new Error(
                    data.message ||
                    data.error ||
                    'Không lấy được link phát nhạc.'
                );
            }

            player.src = data.url;
            player.load();

        } catch (error) {

            console.error('STREAM ERROR:', error);

            msg(
                'Không thể phát bài hát: ' +
                error.message,
                true
            );

        }

        /* =========================
           DOWNLOAD VẪN TRẢ PHÍ
           ========================= */

        download.href =
            '/api/web/download?id=' +
            encodeURIComponent(songId);
            encodeURIComponent(songId);

        result.hidden = false;

        msg(
            'Đã tìm thấy: ' +
            (song.title || 'Bài hát') +
            ' — Nghe miễn phí.'
        );
    }


    async function openPlaylist(id) {
        msg('Đang tải album / playlist...');

        const data = await api(
            '/api/detail-playlist?id=' +
            encodeURIComponent(id)
        );

        const playlist = data.data || {};

        const songs =
            Array.isArray(playlist.song?.items)
                ? playlist.song.items
                : Array.isArray(playlist.songs)
                    ? playlist.songs
                    : [];

        if (!songs.length) {
            throw new Error(
                'Không tìm thấy danh sách bài hát trong album / playlist.'
            );
        }

        albumTitle.textContent =
            playlist.title || 'Album / Playlist';

        albumList.innerHTML = '';

        songs.forEach((song, index) => {
            if (!song || !song.encodeId) return;

            const item = document.createElement('div');
            item.className = 'album-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'album-check';
            checkbox.value = song.encodeId;
            checkbox.dataset.title = song.title || 'Bài hát';
            checkbox.checked = true;

            const image = document.createElement('img');
            image.className = 'album-cover';
            image.alt = song.title || 'Ảnh bài hát';
            image.src =
                song.thumbnailM ||
                song.thumbnail ||
                song.thumbnailV2 ||
                '';

            image.width = 40;
            image.height = 40;
            image.loading = 'lazy';

            const info = document.createElement('div');
            info.className = 'album-info';

            const name = document.createElement('strong');
            name.textContent =
                (index + 1) + '. ' + (song.title || 'Bài hát');

            const artists = document.createElement('small');
            artists.textContent =
                song.artistsNames || 'Không rõ nghệ sĩ';

            const fileSize = document.createElement('span');
            fileSize.className = 'file-size';

            const duration = Number(song.duration || 0);

            if (duration > 0) {
                const estimatedBytes =
                    duration * 128000 / 8;

                if (estimatedBytes >= 1024 * 1024) {
                    fileSize.textContent =
                        (estimatedBytes / (1024 * 1024)).toFixed(1) +
                        ' MB';
                } else {
                    fileSize.textContent =
                        Math.round(estimatedBytes / 1024) +
                        ' KB';
                }
            } else {
                fileSize.textContent = '128 Kbps';
            }

            info.appendChild(name);
            info.appendChild(artists);

            item.appendChild(checkbox);
            item.appendChild(image);
            item.appendChild(info);
            item.appendChild(fileSize);

            albumList.appendChild(item);
        });

        albumBox.hidden = false;
        result.hidden = true;

        msg(
            'Đã tìm thấy ' +
            songs.length +
            ' bài trong "' +
            (playlist.title || 'album / playlist') +
            '". Tối đa 50 bài mỗi file ZIP.'
        );
    }


    /* =========================
       POPUP THÔNG BÁO
       ========================= */
    function showPopup(title, message, type = 'error') {
        const old = document.getElementById('downloadPopup');
        if (old) old.remove();

        const overlay = document.createElement('div');
        overlay.id = 'downloadPopup';

        overlay.innerHTML = `
            <div class="download-popup">
                <div class="popup-icon">
                    ${type === 'error' ? '⚠️' : '✓'}
                </div>

                <h3>${title}</h3>

                <p>${message}</p>

                <button type="button" id="closeDownloadPopup">
                    ĐÃ HIỂU
                </button>
            </div>
        `;

        document.body.appendChild(overlay);

        const close = () => overlay.remove();

        document
            .getElementById('closeDownloadPopup')
            .addEventListener('click', close);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close();
        });
    }

    function showDownloadPopup(title, message) {

        const old = document.getElementById('downloadPopup');

        if (old) {
            old.remove();
        }

        const overlay = document.createElement('div');

        overlay.id = 'downloadPopup';

        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.right = '0';
        overlay.style.bottom = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';

        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';

        overlay.style.background = 'rgba(20, 15, 40, 0.55)';

        overlay.style.zIndex = '2147483647';

        overlay.style.padding = '20px';

        overlay.style.boxSizing = 'border-box';

        const box = document.createElement('div');

        box.style.width = '380px';
        box.style.maxWidth = '95vw';

        box.style.background = '#ffffff';

        box.style.borderRadius = '18px';

        box.style.padding = '28px 22px';

        box.style.boxSizing = 'border-box';

        box.style.textAlign = 'center';

        box.style.boxShadow =
            '0 20px 60px rgba(0,0,0,0.3)';

        const icon = document.createElement('div');

        icon.textContent = '⚠️';

        icon.style.fontSize = '42px';

        icon.style.marginBottom = '8px';

        const heading = document.createElement('h3');

        heading.textContent = title;

        heading.style.margin = '5px 0 10px';

        heading.style.fontSize = '20px';

        heading.style.fontWeight = '700';

        heading.style.color = '#29233d';

        const text = document.createElement('p');

        text.textContent = message;

        text.style.margin = '0 auto 20px';

        text.style.fontSize = '14px';

        text.style.lineHeight = '22px';

        text.style.color = '#666666';

        const button = document.createElement('button');

        button.type = 'button';

        button.textContent = 'ĐÃ HIỂU';

        button.style.border = '0';

        button.style.padding = '10px 28px';

        button.style.borderRadius = '9px';

        button.style.background =
            'linear-gradient(90deg, #4b3cff, #c13bdd, #ed2385)';

        button.style.color = '#ffffff';

        button.style.fontSize = '13px';

        button.style.fontWeight = '700';

        button.style.cursor = 'pointer';

        box.appendChild(icon);
        box.appendChild(heading);
        box.appendChild(text);
        box.appendChild(button);

        overlay.appendChild(box);

        document.body.appendChild(overlay);

        button.addEventListener('click', function () {
            overlay.remove();
        });

        overlay.addEventListener('click', function (event) {

            if (event.target === overlay) {
                overlay.remove();
            }

        });
    }


    async function searchByName(keyword) {

        const params = new URLSearchParams();
        params.set('q', keyword);

        const data = await api(
            '/api/search?' + params.toString()
        );

        const songs = Array.isArray(data.data?.songs)
            ? data.data.songs
            : [];

        console.log('SONGS:', songs);

        if (!songs.length) {
            throw new Error('Không tìm thấy bài hát.');
        }

        const key = keyword.toLowerCase();

        const song =
            songs.find(item => {
                const name =
                    String(item.title || '').toLowerCase();

                const artists =
                    String(item.artistsNames || '').toLowerCase();

                return (
                    item.encodeId &&
                    (
                        name.includes(key) ||
                        artists.includes(key)
                    )
                );
            }) ||
            songs.find(item => item && item.encodeId);

        if (!song) {
            throw new Error('Không tìm thấy bài hát phù hợp.');
        }

        showSong(song);
    }

    async function searchById(id) {

        const data = await api(
            '/api/info-song?id=' +
            encodeURIComponent(id)
        );

        console.log('INFO:', data);

        const song = data.data || {};

        showSong(song, id);
    }

    selectAll.addEventListener('click', () => {
        const checks = document.querySelectorAll('.album-check');

        if (!checks.length) return;

        const allChecked = Array.from(checks).every(
            checkbox => checkbox.checked
        );

        checks.forEach(checkbox => {
            checkbox.checked = !allChecked;
        });

        selectAll.textContent = allChecked
            ? '☑ CHỌN TẤT CẢ'
            : '☐ BỎ CHỌN TẤT CẢ';
    });

    if (downloadAll) {

        downloadAll.addEventListener('click', async function () {

            const checks = Array.from(
                document.querySelectorAll('.album-check:checked')
            );

            console.log('SO BAI DA CHON:', checks.length);

            /* ===== KIỂM TRA KHÔNG CHỌN ===== */
            if (checks.length === 0) {
                showDownloadPopup(
                    'Chưa chọn bài hát',
                    'Vui lòng chọn ít nhất một bài hát để tải.'
                );
                return;
            }

            /* ===== GIỚI HẠN 50 BÀI ===== */
            if (checks.length > 50) {

                showDownloadPopup(
                    'Không thể tải',
                    'Mỗi file ZIP chỉ được phép tải tối đa 50 bài hát.\\nVui lòng bỏ chọn bớt bài hát rồi thử lại.'
                );

                return;
            }

            const songs = checks.map(function (check) {
                return {
                    id: check.value,
                    title: check.dataset.title || 'Bài hát'
                };
            });

            const name =
                albumTitle.textContent.trim() ||
                'zingmp3-download';

            msg(
                'Đang chuẩn bị tải ZIP ' +
                songs.length +
                ' bài...'
            );

            try {

                const response = await fetch(
                    '/api/web/download-all',
                    {
                        method: 'POST',

                        headers: {
                            'Content-Type': 'application/json'
                        },

                        body: JSON.stringify({
                            songs: songs,
                            name: name
                        })
                    }
                );

                if (!response.ok) {

                    let message =
                        'Không thể tạo file ZIP. Vui lòng thử lại.';

                    try {

                        const data =
                            await response.json();

                        if (data.error) {
                            message = data.error;
                        }

                        if (data.message) {
                            message = data.message;
                        }

                    } catch (e) {}

                    showDownloadPopup(
                        'Tải ZIP thất bại',
                        message
                    );

                    return;
                }

                const blob =
                    await response.blob();

                const url =
                    URL.createObjectURL(blob);

                const a =
                    document.createElement('a');

                a.href = url;

                a.download =
                    name + '.zip';

                document.body.appendChild(a);

                a.click();

                a.remove();

                setTimeout(function () {
                    URL.revokeObjectURL(url);
                }, 10000);

                /* ===== ĐÁNH DẤU NHỮNG BÀI ĐÃ TẢI XONG ===== */

                checks.forEach(function (checkbox) {

                    const item = checkbox.closest('.album-item');

                    if (!item) return;

                    item.classList.add('downloaded');

                    let badge = item.querySelector('.downloaded-badge');

                    if (!badge) {
                        badge = document.createElement('span');
                        badge.className = 'downloaded-badge';
                        badge.textContent = '✓ Đã tải';

                        item.appendChild(badge);
                    }

                });

                msg(
                    '✓ Đã tải thành công ' +
                    songs.length +
                    ' bài.'
                );

            } catch (error) {

                console.error(
                    'DOWNLOAD ZIP ERROR:',
                    error
                );

                showDownloadPopup(
                    'Tải ZIP thất bại',
                    error.message ||
                    'Không thể tải file ZIP.'
                );
            }

        });
    }

    let autoTimer = null;

    async function pasteFromClipboard() {
        try {
            const text = await navigator.clipboard.readText();

            if (!text) {
                msg('Clipboard không có nội dung.', true);
                return;
            }

            input.value = text.trim();
            input.focus();

            clearTimeout(autoTimer);
            autoTimer = setTimeout(() => {
                form.requestSubmit();
            }, 400);
        } catch (error) {
            msg('Không thể đọc clipboard. Hãy cho phép quyền dán.', true);
        }
    }

    if (pasteButton) {
        pasteButton.addEventListener('click', pasteFromClipboard);
    }

    input.addEventListener('input', () => {
        clearTimeout(autoTimer);

        const value = input.value.trim();

        /* Xóa nội dung ô tìm kiếm -> xóa luôn kết quả */
        if (!value) {
            clearPreviousResults();

            /* Xóa luôn dòng trạng thái cũ dưới nút XÁC NHẬN */
            status.textContent = '';
            status.className = 'status';

            return;
        }

        autoTimer = setTimeout(() => {
            form.requestSubmit();
        }, 800);
    });

    form.addEventListener('submit', async event => {

        event.preventDefault();

        console.log('========== ZINGDOWNLOAD ==========');
        console.log('BUTTON CLICKED');

        const value = input.value.trim();

        console.log('INPUT:', value);

        /* Xóa hoàn toàn kết quả của lần tìm trước */
        clearPreviousResults();

        if (!value) {
            msg('Vui lòng nhập tên bài hát hoặc link bài hát.', true);
            return;
        }

        result.hidden = true;

        button.disabled = true;
        button.textContent = 'ĐANG TÌM...';

        try {

            const id = getId(value);

            console.log('ID:', id);

            if (
                value.includes('/album/') ||
                value.includes('/playlist/')
            ) {

                if (!id) {
                    throw new Error(
                        'Không nhận diện được ID album / playlist.'
                    );
                }

                await openPlaylist(id);

            } else if (id) {

                msg('Đang lấy thông tin bài hát...');

                await searchById(id);

            } else {

                await searchByName(value);

            }

        } catch (error) {

            console.error('ERROR:', error);

            msg(
                error.message ||
                'Có lỗi xảy ra.',
                true
            );

        } finally {

            button.disabled = false;
            button.textContent = 'XÁC NHẬN';

        }

    });

});
