import { 
  doc, setDoc, updateDoc, collection, query, where, getDocs, writeBatch 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SocialPost, FileFolder, AgencyFile } from '../types';

/**
 * Archives a social post and its associated files.
 * 
 * 1. Marks post as archived.
 * 2. Ensures "Archive/Posted Posts" folder structure exists for the client.
 * 3. Creates a post-specific folder.
 * 4. Moves all files from the source task to that folder.
 */
export const archiveSocialPost = async (post: SocialPost, archivedByUserId: string) => {
  try {
    const batch = writeBatch(db);
    const now = new Date().toISOString();

    // 1. Update SocialPost
    const postRef = doc(db, 'socialPosts', post.id);
    batch.update(postRef, {
      isArchived: true,
      archivedAt: now,
      archivedBy: archivedByUserId
    });

    // 2. Find Client Root Folder
    // We assume standard structure: client_{clientId}
    const clientRootId = `client_${post.clientId}`;
    
    // 3. Find or Create "Archive" Folder for Client
    const foldersRef = collection(db, 'folders');
    const archiveQuery = query(
      foldersRef,
      where('clientId', '==', post.clientId),
      where('folderType', '==', 'archive')
    );
    const archiveSnapshot = await getDocs(archiveQuery);
    
    let archiveRootId: string;
    if (!archiveSnapshot.empty) {
      archiveRootId = archiveSnapshot.docs[0].id;
    } else {
      // Fallback: Create Archive folder if missing
      archiveRootId = `${clientRootId}_archive`;
      const newArchiveFolder: FileFolder = {
        id: archiveRootId,
        clientId: post.clientId,
        projectId: null,
        parentId: clientRootId,
        name: 'Archive',
        isArchiveRoot: true,
        isTaskArchiveFolder: false,
        folderType: 'archive'
      };
      batch.set(doc(db, 'folders', archiveRootId), newArchiveFolder);
    }

    // 4. Find or Create "Posted Posts" Folder inside Archive
    const postedPostsQuery = query(
      foldersRef,
      where('parentId', '==', archiveRootId),
      where('name', '==', 'Posted Posts')
    );
    const postedPostsSnapshot = await getDocs(postedPostsQuery);

    let postedPostsFolderId: string;
    if (!postedPostsSnapshot.empty) {
      postedPostsFolderId = postedPostsSnapshot.docs[0].id;
    } else {
      postedPostsFolderId = `f_posted_${post.clientId}_${Date.now()}`;
      const newPostedFolder: FileFolder = {
        id: postedPostsFolderId,
        clientId: post.clientId,
        projectId: post.projectId,
        parentId: archiveRootId,
        name: 'Posted Posts',
        isArchiveRoot: false,
        isTaskArchiveFolder: false,
        folderType: 'archive'
      };
      batch.set(doc(db, 'folders', postedPostsFolderId), newPostedFolder);
    }

    // 5. Create Folder for THIS Post
    const postFolderId = `f_post_${post.id}`;
    const postFolder: FileFolder = {
      id: postFolderId,
      clientId: post.clientId,
      projectId: post.projectId,
      parentId: postedPostsFolderId,
      name: `${post.title || 'Untitled Post'} - ${new Date(post.publishAt || now).toISOString().split('T')[0]}`,
      isArchiveRoot: false,
      isTaskArchiveFolder: false,
      taskId: post.sourceTaskId
    };
    batch.set(doc(db, 'folders', postFolderId), postFolder);

    // 6. Move Files linked to the Source Task
    if (post.sourceTaskId) {
      const filesRef = collection(db, 'files');
      const taskFilesQuery = query(filesRef, where('taskId', '==', post.sourceTaskId));
      const taskFilesSnapshot = await getDocs(taskFilesQuery);

      taskFilesSnapshot.forEach((fileDoc) => {
        batch.update(fileDoc.ref, {
          folderId: postFolderId,
          isArchived: true,
          archivedAt: now
        });
      });
    }

    await batch.commit();
    console.log(`Archived post ${post.id} to folder ${postFolderId}`);
    return true;

  } catch (error) {
    console.error("Error archiving social post:", error);
    throw error;
  }
};
