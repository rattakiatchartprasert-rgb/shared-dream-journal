// public/script.js (เวอร์ชันเต็ม - แก้ไขบั๊ก _id ของ Mongo)

document.addEventListener("DOMContentLoaded", () => {
  // === ส่วนดึง Element ===
  const dreamForm = document.getElementById("dream-form");
  const dreamTitleInput = document.getElementById("dream-title");
  const dreamContentInput = document.getElementById("dream-content");
  const dreamList = document.getElementById("dream-list");
  const editModal = document.getElementById("edit-modal");
  const editForm = document.getElementById("edit-form");
  const editDreamId = document.getElementById("edit-dream-id");
  const editDreamTitle = document.getElementById("edit-dream-title");
  const editDreamContent = document.getElementById("edit-dream-content");
  const btnCancel = document.getElementById("btn-cancel");
  const searchInput = document.getElementById("search-input");
  const btnPrev = document.getElementById("btn-prev");
  const btnNext = document.getElementById("btn-next");
  const pageInfo = document.getElementById("page-info");
  const sortSelect = document.getElementById("sort-select");
  const toastContainer = document.getElementById("toast-container");

  // === State ของหน้า ===
  let currentPage = 1;
  let currentKeyword = "";
  let currentSort = "latest";
  const limit = 5;

  // === ฟังก์ชัน ===

  // 0. ฟังก์ชันแสดง Toast
  function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.classList.add("show");
    }, 100);
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => {
        toast.remove();
      }, 500);
    }, 3000);
  }

  // 0.5. ฟังก์ชันแสดง Spinner
  function showSpinner() {
    dreamList.innerHTML = `
      <div class="spinner-container">
        <div class="spinner"></div>
      </div>
    `;
    btnPrev.disabled = true;
    btnNext.disabled = true;
    pageInfo.textContent = "Loading...";
  }

  // 1. สร้าง HTML (!!! แก้ไขตรงนี้ !!!)
  function createDreamElement(dream) {
    const div = document.createElement("div");
    div.className = "dream-item";
    div.dataset.id = dream._id; // <-- (แก้ไข) ใช้ _id
    const buttonsWrapper = document.createElement("div");
    buttonsWrapper.className = "dream-item-buttons";
    const editButton = document.createElement("button");
    editButton.className = "btn-edit";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", (e) => {
      e.stopPropagation();
      openEditModal(dream); // (ส่ง dream ทั้งก้อนไป)
    });
    const deleteButton = document.createElement("button");
    deleteButton.className = "btn-delete";
    deleteButton.textContent = "X";
    deleteButton.addEventListener("click", (e) => {
      e.stopPropagation();
      handleDeleteDream(dream._id, div); // <-- (แก้ไข) ใช้ _id
    });
    buttonsWrapper.appendChild(editButton);
    buttonsWrapper.appendChild(deleteButton);
    const title = document.createElement("h3");
    title.textContent = dream.title;
    const content = document.createElement("p");
    content.textContent = dream.content;
    const timestamp = document.createElement("small");
    timestamp.textContent = `Last updated: ${new Date(
      dream.updatedAt
    ).toLocaleString()}`;
    div.appendChild(buttonsWrapper);
    div.appendChild(title);
    div.appendChild(content);
    div.appendChild(timestamp);
    return div;
  }

  // 2. ดึงข้อมูล
  async function fetchDreams(
    keyword = currentKeyword,
    page = currentPage,
    sort = currentSort
  ) {
    currentKeyword = keyword;
    currentPage = page;
    currentSort = sort;
    showSpinner();
    try {
      let url = `/dreams?sort=${currentSort}&limit=${limit}&page=${currentPage}`;
      if (currentKeyword) {
        url += `&keyword=${encodeURIComponent(currentKeyword)}`;
      }
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
      const data = await response.json();
      dreamList.innerHTML = "";
      if (data.dreams.length === 0 && currentPage === 1) {
        dreamList.innerHTML = '<p class="no-results">No dreams found.</p>';
        pageInfo.textContent = "Page 1";
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
      console.error(
        "Error fetching dreams (Server might be down or crashing):",
        error
      );
      dreamList.innerHTML =
        '<p class="no-results" style="color: #ff4d4d;">Error: ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้</p>';
      pageInfo.textContent = "Page 1";
      btnPrev.disabled = true;
      btnNext.disabled = true;
      showToast("Error: Server connection failed", "error");
    }
  }

  // 3. ส่งความฝัน
  async function submitDream(e) {
    e.preventDefault();
    const title = dreamTitleInput.value;
    const content = dreamContentInput.value;
    if (!title || !content) return;
    try {
      const response = await fetch("/dreams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      if (response.ok) {
        fetchDreams(currentKeyword, 1, "latest");
        sortSelect.value = "latest";
        dreamTitleInput.value = "";
        dreamContentInput.value = "";
        showToast("Dream shared successfully!", "success");
      } else {
        const newDream = await response.json();
        console.error("Error submitting dream:", newDream.error);
        showToast("Error: Failed to share dream", "error");
      }
    } catch (error) {
      console.error("Error submitting dream:", error);
      showToast("Error: Connection failed", "error");
    }
  }

  // 3.5. ลบความฝัน
  async function handleDeleteDream(id, element) {
    if (!confirm("Are you sure you want to delete this dream?")) {
      return;
    }
    try {
      const response = await fetch(`/dreams/${id}`, { method: "DELETE" }); // (id ที่ส่งมาคือ _id ที่ถูกต้องแล้ว)
      if (response.ok) {
        fetchDreams(currentKeyword, currentPage, currentSort);
        showToast("Dream deleted.");
      } else {
        alert("Failed to delete dream."); // (Error ของคุณ)
        showToast("Error: Failed to delete", "error");
      }
    } catch (error) {
      console.error("Error deleting dream:", error);
      showToast("Error: Connection failed", "error");
    }
  }

  // 4. ฟังก์ชัน Modal (!!! แก้ไขตรงนี้ !!!)
  function openEditModal(dream) {
    editDreamId.value = dream._id; // <-- (แก้ไข) ใช้ _id
    editDreamTitle.value = dream.title;
    editDreamContent.value = dream.content;
    editModal.style.display = "flex";
  }
  function closeEditModal() {
    editModal.style.display = "none";
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    const id = editDreamId.value; // (id นี้จะมาจาก _id ที่ถูกต้องแล้ว)
    const title = editDreamTitle.value;
    const content = editDreamContent.value;

    try {
      const response = await fetch(`/dreams/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      if (response.ok) {
        fetchDreams(currentKeyword, currentPage, currentSort);
        closeEditModal();
        showToast("Dream updated!", "success");
      } else {
        alert("Failed to update dream."); // (Error ของคุณ)
        showToast("Error: Failed to update", "error");
      }
    } catch (error) {
      console.error("Error updating dream:", error);
      showToast("Error: Connection failed", "error");
    }
  }

  // === Event Listeners ===
  dreamForm.addEventListener("submit", submitDream);
  editForm.addEventListener("submit", handleEditSubmit);
  btnCancel.addEventListener("click", closeEditModal);

  editModal.addEventListener("click", (e) => {
    if (e.target === editModal) {
      closeEditModal();
    }
  });

  searchInput.addEventListener("input", (e) => {
    const keyword = e.target.value;
    fetchDreams(keyword, 1, currentSort);
  });

  btnPrev.addEventListener("click", () => {
    if (currentPage > 1) {
      fetchDreams(currentKeyword, currentPage - 1, currentSort);
    }
  });

  btnNext.addEventListener("click", () => {
    fetchDreams(currentKeyword, currentPage + 1, currentSort);
  });

  sortSelect.addEventListener("change", (e) => {
    const newSort = e.target.value;
    fetchDreams(currentKeyword, 1, newSort);
  });

  // --- 5. สั่งให้ฟังก์ชันหลักทำงาน ---
  fetchDreams();
});
