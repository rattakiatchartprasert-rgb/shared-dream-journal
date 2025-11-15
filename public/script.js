// public/script.js (เวอร์ชันเต็ม - แก้ไข Error Catch)

document.addEventListener('DOMContentLoaded', () => {
  // === ส่วนดึง Element ===
  const dreamForm = document.getElementById('dream-form');
  const dreamTitleInput = document.getElementById('dream-title');
  const dreamContentInput = document.getElementById('dream-content');
  const dreamList = document.getElementById('dream-list');
  const editModal = document.getElementById('edit-modal');
  const editForm = document.getElementById('edit-form');
  const editDreamId = document.getElementById('edit-dream-id');
  const editDreamTitle = document.getElementById('edit-dream-title');
  const editDreamContent = document.getElementById('edit-dream-content');
  const btnCancel = document.getElementById('btn-cancel');
  const searchInput = document.getElementById('search-input');
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const pageInfo = document.getElementById('page-info');

  // === State ของหน้า ===
  let currentPage = 1;
  let currentKeyword = '';
  const limit = 5; 

  // === Event Listeners ===
  dreamForm.addEventListener('submit', submitDream);
  editForm.addEventListener('submit', handleEditSubmit);
  btnCancel.addEventListener('click', closeEditModal);
  
  editModal.addEventListener('click', (e) => {
    if (e.target === editModal) {
      closeEditModal();
    }
  });

  searchInput.addEventListener('input', (e) => {
    const keyword = e.target.value;
    fetchDreams(keyword, 1); 
  });

  btnPrev.addEventListener('click', () => {
    if (currentPage > 1) {
      fetchDreams(currentKeyword, currentPage - 1);
    }
  });

  btnNext.addEventListener('click', () => {
    fetchDreams(currentKeyword, currentPage + 1);
  });

  // --- 1. ฟังก์ชันสำหรับสร้าง HTML ---
  const createDreamElement = (dream) => {
    const div = document.createElement('div');
    div.className = 'dream-item';
    div.dataset.id = dream.id;
    const buttonsWrapper = document.createElement('div');
    buttonsWrapper.className = 'dream-item-buttons';
    const editButton = document.createElement('button');
    editButton.className = 'btn-edit';
    editButton.textContent = 'Edit';
    editButton.addEventListener('click', (e) => {
      e.stopPropagation();
      openEditModal(dream);
    });
    const deleteButton = document.createElement('button');
    deleteButton.className = 'btn-delete';
    deleteButton.textContent = 'X';
    deleteButton.addEventListener('click', (e) => {
      e.stopPropagation();
      handleDeleteDream(dream.id, div);
    });
    buttonsWrapper.appendChild(editButton);
    buttonsWrapper.appendChild(deleteButton);
    const title = document.createElement('h3');
    title.textContent = dream.title;
    const content = document.createElement('p');
    content.textContent = dream.content;
    const timestamp = document.createElement('small');
    timestamp.textContent = `Last updated: ${new Date(
      dream.updatedAt
    ).toLocaleString()}`;
    div.appendChild(buttonsWrapper);
    div.appendChild(title);
    div.appendChild(content);
    div.appendChild(timestamp);
    return div;
  };

  // --- 2. ฟังก์ชันสำหรับดึงความฝัน (อัปเกรด catch) ---
  const fetchDreams = async (keyword = currentKeyword, page = currentPage) => {
    currentKeyword = keyword; 
    currentPage = page;

    try {
      let url = `/dreams?sort=latest&limit=${limit}&page=${currentPage}`;
      if (currentKeyword) {
        url += `&keyword=${encodeURIComponent(currentKeyword)}`;
      }
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
      
      const data = await response.json(); 
      dreamList.innerHTML = ''; 

      if (data.dreams.length === 0 && currentPage === 1) {
        dreamList.innerHTML = '<p class="no-results">No dreams found.</p>';
        pageInfo.textContent = 'Page 1';
      } else {
        data.dreams.forEach((dream) => {
          const dreamElement = createDreamElement(dream);
          dreamList.appendChild(dreamElement);
        });
        pageInfo.textContent = `Page ${data.page}`;
      }
      const totalPages = Math.ceil(data.total / limit);
      btnPrev.disabled = currentPage <= 1;
      btnNext.disabled = currentPage >= totalPages;

    } catch (error) {
      // === (นี่คือส่วนที่ถูกต้อง) ===
      console.error('Error fetching dreams (Server might be down or crashing):', error);
      dreamList.innerHTML = '<p class="no-results" style="color: #ff4d4d;">Error: ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้</p>';
      pageInfo.textContent = 'Page 1';
      btnPrev.disabled = true;
      btnNext.disabled = true;
      // === (จบส่วนแก้ไข) ===
    }
  };

  // --- 3. ฟังก์ชันสำหรับส่งความฝัน ---
  const submitDream = async (e) => {
    e.preventDefault(); 
    const title = dreamTitleInput.value;
    const content = dreamContentInput.value;
    if (!title || !content) return; 
    try {
      const response = await fetch('/dreams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }), 
      });
      if (response.ok) {
        fetchDreams(currentKeyword, 1); 
        dreamTitleInput.value = '';
        dreamContentInput.value = '';
      } else {
        const newDream = await response.json();
        console.error('Error submitting dream:', newDream.error);
      }
    } catch (error) {
      console.error('Error submitting dream:', error);
    }
  };

  // --- 3.5. ฟังก์ชันสำหรับลบความฝัน ---
  const handleDeleteDream = async (id, element) => {
    if (!confirm('Are you sure you want to delete this dream?')) {
      return;
    }
    try {
      const response = await fetch(`/dreams/${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchDreams(currentKeyword, currentPage); 
      } else {
        alert('Failed to delete dream.');
      }
    } catch (error) {
      console.error('Error deleting dream:', error);
    }
  };

  // --- 4. ฟังก์ชัน Modal ---
  function openEditModal(dream) {
    editDreamId.value = dream.id;
    editDreamTitle.value = dream.title;
    editDreamContent.value = dream.content;
    editModal.style.display = 'flex'; 
  };
  function closeEditModal() {
    editModal.style.display = 'none'; 
  };
  async function handleEditSubmit(e) {
    e.preventDefault();
    const id = editDreamId.value;
    const title = editDreamTitle.value;
    const content = editDreamContent.value;
    try {
      const response = await fetch(`/dreams/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      });
      if (response.ok) {
        const updatedDream = await response.json();
        const dreamElement = document.querySelector(`.dream-item[data-id="${id}"]`);
        if (dreamElement) {
          dreamElement.querySelector('h3').textContent = updatedDream.title;
          dreamElement.querySelector('p').textContent = updatedDream.content;
          dreamElement.querySelector('small').textContent = `Last updated: ${new Date(
            updatedDream.updatedAt
          ).toLocaleString()}`;
        }
        closeEditModal();
      } else {
        alert('Failed to update dream.');
      }
    } catch (error) {
      console.error('Error updating dream:', error);
    }
  };

  // --- 5. สั่งให้ฟังก์ชันหลักทำงาน ---
  fetchDreams(); // โหลดครั้งแรก
});